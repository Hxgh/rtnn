import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    account: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshSession: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    loginEvent: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const appConfigService = {
    jwtAccessExpiresIn: '15m',
    jwtRefreshExpiresIn: '7d',
  };
  const authTokenService = {
    verifyRefreshToken: jest.fn(),
    hashToken: jest.fn(),
    createAccessToken: jest.fn(),
    createRefreshToken: jest.fn(),
  };
  const passwordService = {
    verify: jest.fn(),
    hash: jest.fn(),
  };
  const loginRateLimitService = {
    assertAllowed: jest.fn(),
    onFailure: jest.fn(),
    onSuccess: jest.fn(),
  };
  const auditWriter = {
    write: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authTokenService.hashToken.mockReturnValue('token-hash');
    authTokenService.createAccessToken.mockReturnValue('access-token');
    authTokenService.createRefreshToken.mockReturnValue({
      token: 'refresh-token',
      rid: 'rid_01',
    });
    passwordService.hash.mockResolvedValue('hashed-next-password');
    prisma.$transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) =>
        callback({
          account: {
            update: jest.fn().mockResolvedValue(undefined),
          },
          refreshSession: {
            updateMany: jest.fn().mockResolvedValue(undefined),
            create: jest.fn().mockResolvedValue(undefined),
            update: jest.fn().mockResolvedValue(undefined),
          },
        }),
    );

    service = new AuthService(
      prisma as never,
      appConfigService as never,
      authTokenService as never,
      passwordService as never,
      loginRateLimitService as never,
      auditWriter as never,
    );
  });

  it('logs in successfully with an admin audience', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 'acc_admin',
      email: 'admin@rtnn.local',
      passwordHash: 'hash',
      status: 'active',
      credentialsVersion: 2,
      adminProfile: {
        name: 'Template Admin',
      },
      customerProfile: null,
      roles: [
        {
          role: {
            slug: 'super-admin',
            permissionLinks: [
              {
                permission: {
                  key: 'admin:users:view',
                },
              },
            ],
          },
        },
      ],
    });
    passwordService.verify.mockResolvedValue(true);
    prisma.refreshSession.create.mockResolvedValue(undefined);
    prisma.account.update.mockResolvedValue(undefined);
    prisma.loginEvent.create.mockResolvedValue(undefined);

    const result = await service.login(
      {
        email: 'admin@rtnn.local',
        password: 'Admin123!@#',
      },
      'admin',
      {
        ip: '127.0.0.1',
      },
    );

    expect(result.user.audience).toBe('admin');
    expect(result.user.roles).toContain('super-admin');
    expect(result.user.permissions).toContain('admin:users:view');
    expect(result.tokens.accessToken).toBe('access-token');
    expect(loginRateLimitService.onSuccess).toHaveBeenCalled();
  });

  it('rejects invalid credentials', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 'acc_admin',
      email: 'admin@rtnn.local',
      passwordHash: 'hash',
      status: 'active',
      credentialsVersion: 1,
      adminProfile: {
        name: 'Template Admin',
      },
      customerProfile: null,
      roles: [],
    });
    passwordService.verify.mockResolvedValue(false);
    prisma.loginEvent.create.mockResolvedValue(undefined);

    await expect(
      service.login(
        {
          email: 'admin@rtnn.local',
          password: 'wrong-password',
        },
        'admin',
        {},
      ),
    ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));

    expect(loginRateLimitService.onFailure).toHaveBeenCalled();
  });

  it('rejects inactive accounts', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 'acc_admin',
      email: 'admin@rtnn.local',
      passwordHash: 'hash',
      status: 'disabled',
      credentialsVersion: 1,
      adminProfile: {
        name: 'Template Admin',
      },
      customerProfile: null,
      roles: [],
    });
    prisma.loginEvent.create.mockResolvedValue(undefined);

    await expect(
      service.login(
        {
          email: 'admin@rtnn.local',
          password: 'Admin123!@#',
        },
        'admin',
        {},
      ),
    ).rejects.toThrow(new ForbiddenException('Account is not active'));
  });

  it('rejects blocked customer accounts', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 'acc_customer',
      email: 'customer@rtnn.local',
      passwordHash: 'hash',
      status: 'active',
      credentialsVersion: 1,
      adminProfile: null,
      customerProfile: {
        name: 'Template Customer',
        status: 'blocked',
      },
      roles: [],
    });

    await expect(
      service.login(
        {
          email: 'customer@rtnn.local',
          password: 'Customer123!@#',
        },
        'customer',
        {},
      ),
    ).rejects.toThrow(new ForbiddenException('Customer is blocked'));
  });

  it('rejects refresh tokens with mismatched audiences', async () => {
    authTokenService.verifyRefreshToken.mockReturnValue({
      sub: 'acc_admin',
      email: 'admin@rtnn.local',
      audience: 'admin',
      sid: 'sid_01',
      ver: 1,
      rid: 'rid_01',
      type: 'refresh',
    });

    await expect(service.refresh('refresh-token', 'customer')).rejects.toThrow(
      new UnauthorizedException('Refresh token audience mismatch'),
    );
  });

  it('rotates refresh sessions on refresh', async () => {
    authTokenService.verifyRefreshToken.mockReturnValue({
      sub: 'acc_admin',
      email: 'admin@rtnn.local',
      audience: 'admin',
      sid: 'sid_01',
      ver: 2,
      rid: 'rid_01',
      type: 'refresh',
    });
    prisma.refreshSession.findUnique.mockResolvedValue({
      id: 'sid_01',
      accountId: 'acc_admin',
      audience: 'admin',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      account: {
        id: 'acc_admin',
        email: 'admin@rtnn.local',
        passwordHash: 'hash',
        status: 'active',
        credentialsVersion: 2,
        adminProfile: {
          name: 'Template Admin',
        },
        customerProfile: null,
        roles: [],
      },
    });
    prisma.refreshSession.create.mockResolvedValue(undefined);
    prisma.refreshSession.update.mockResolvedValue(undefined);

    const result = await service.refresh('refresh-token', 'admin');

    expect(result.tokens.refreshToken).toBe('refresh-token');
    expect(prisma.refreshSession.update).toHaveBeenCalledWith({
      where: { id: 'sid_01' },
      data: expect.objectContaining({
        replacedBy: expect.any(String),
      }),
    });
  });

  it('keeps logout idempotent when the token is missing or invalid', async () => {
    await expect(service.logout(undefined, 'admin')).resolves.toEqual({
      success: true,
    });

    authTokenService.verifyRefreshToken.mockImplementation(() => {
      throw new UnauthorizedException('Invalid or expired refresh token');
    });

    await expect(service.logout('bad-token', 'admin')).resolves.toEqual({
      success: true,
    });
    expect(prisma.refreshSession.updateMany).not.toHaveBeenCalled();
  });

  it('changes password, invalidates existing sessions, and writes audit records', async () => {
    prisma.account.findUnique.mockResolvedValue({
      id: 'acc_admin',
      email: 'admin@rtnn.local',
      passwordHash: 'hash',
      status: 'active',
      credentialsVersion: 3,
      adminProfile: {
        name: 'Template Admin',
      },
      customerProfile: null,
      roles: [],
    });
    passwordService.verify.mockResolvedValue(true);

    await service.changePassword(
      {
        type: 'admin',
        accountId: 'acc_admin',
        name: 'Template Admin',
      },
      'acc_admin',
      'admin',
      'OldPass123!@#',
      'NewPass123!@#',
    );

    expect(passwordService.hash).toHaveBeenCalledWith('NewPass123!@#');
    expect(auditWriter.write).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'account.password.change',
      }),
      expect.any(Object),
    );
  });
});
