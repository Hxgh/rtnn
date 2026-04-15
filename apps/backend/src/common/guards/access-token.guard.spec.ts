import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AccessTokenGuard } from './access-token.guard';

function createContext(authorization?: string) {
  const request = {
    header: jest.fn((name: string) =>
      name === 'authorization' ? authorization : undefined,
    ),
  };

  return {
    context: {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => 'handler',
      getClass: () => 'class',
    } as never,
    request,
  };
}

describe('AccessTokenGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const authTokenService = {
    verifyAccessToken: jest.fn(),
  };
  const prisma = {
    account: {
      findUnique: jest.fn(),
    },
  };

  let guard: AccessTokenGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    reflector.getAllAndOverride.mockReturnValue(false);
    guard = new AccessTokenGuard(
      reflector as never,
      authTokenService as never,
      prisma as never,
    );
  });

  it('rejects when the bearer token is missing', async () => {
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Missing bearer token'),
    );
  });

  it('propagates bad token verification errors', async () => {
    const { context } = createContext('Bearer bad-token');
    authTokenService.verifyAccessToken.mockImplementation(() => {
      throw new UnauthorizedException('Invalid or expired access token');
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Invalid or expired access token',
    );
  });

  it('rejects when the account does not exist', async () => {
    const { context } = createContext('Bearer access-token');
    authTokenService.verifyAccessToken.mockReturnValue({
      sub: 'acc_01',
      email: 'admin@rtnn.local',
      name: 'Template Admin',
      audience: 'admin',
      sid: 'sid_01',
      ver: 1,
      roles: ['super-admin'],
      permissions: ['admin:users:view'],
    });
    prisma.account.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Account not found'),
    );
  });

  it('rejects disabled accounts', async () => {
    const { context } = createContext('Bearer access-token');
    authTokenService.verifyAccessToken.mockReturnValue({
      sub: 'acc_01',
      email: 'admin@rtnn.local',
      name: 'Template Admin',
      audience: 'admin',
      sid: 'sid_01',
      ver: 1,
      roles: ['super-admin'],
      permissions: ['admin:users:view'],
    });
    prisma.account.findUnique.mockResolvedValue({
      status: 'disabled',
      credentialsVersion: 1,
      adminProfile: {
        id: 'adm_01',
      },
      customerProfile: null,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Account is not active'),
    );
  });

  it('rejects expired credentials versions', async () => {
    const { context } = createContext('Bearer access-token');
    authTokenService.verifyAccessToken.mockReturnValue({
      sub: 'acc_01',
      email: 'admin@rtnn.local',
      name: 'Template Admin',
      audience: 'admin',
      sid: 'sid_01',
      ver: 1,
      roles: ['super-admin'],
      permissions: ['admin:users:view'],
    });
    prisma.account.findUnique.mockResolvedValue({
      status: 'active',
      credentialsVersion: 2,
      adminProfile: {
        id: 'adm_01',
      },
      customerProfile: null,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Session is expired'),
    );
  });

  it('rejects blocked customer sessions', async () => {
    const { context } = createContext('Bearer access-token');
    authTokenService.verifyAccessToken.mockReturnValue({
      sub: 'acc_02',
      email: 'customer@rtnn.local',
      name: 'Template Customer',
      audience: 'customer',
      sid: 'sid_02',
      ver: 1,
      roles: ['customer-default'],
      permissions: ['customer:self:view'],
    });
    prisma.account.findUnique.mockResolvedValue({
      status: 'active',
      credentialsVersion: 1,
      adminProfile: null,
      customerProfile: {
        status: 'blocked',
      },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Customer is blocked'),
    );
  });
});
