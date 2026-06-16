import { ForbiddenException } from '@nestjs/common';
import { PermissionGuard } from './permission.guard';

function createContext(permissions: string[] = []) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          sub: 'acc_admin',
          name: 'Template Admin',
          audience: 'admin',
          permissions,
        },
        method: 'PATCH',
        path: '/api/v1/admin/users/acc_admin',
        url: '/api/v1/admin/users/acc_admin',
        ip: '127.0.0.1',
        header: jest.fn((name: string) =>
          name === 'user-agent'
            ? 'Jest'
            : name === 'x-request-id'
              ? 'req_01'
              : undefined,
        ),
      }),
    }),
    getHandler: () => 'handler',
    getClass: () => 'class',
  } as never;
}

describe('PermissionGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const auditWriter = {
    write: jest.fn(),
  };

  let guard: PermissionGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    auditWriter.write.mockResolvedValue(undefined);
    guard = new PermissionGuard(reflector as never, auditWriter as never);
  });

  it('allows public routes', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  it('allows requests with required permissions', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(['admin:users:view']);

    await expect(
      guard.canActivate(createContext(['admin:users:view'])),
    ).resolves.toBe(true);
  });

  it('rejects requests without required permissions and writes audit', async () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(['admin:users:view']);

    await expect(guard.canActivate(createContext([]))).rejects.toThrow(
      new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: 'Permission denied',
        requiredPermissions: ['admin:users:view'],
      }),
    );
    expect(auditWriter.write).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.permission.denied',
        outcome: 'denied',
        detail: expect.objectContaining({
          requiredPermissions: ['admin:users:view'],
        }),
      }),
    );
  });
});
