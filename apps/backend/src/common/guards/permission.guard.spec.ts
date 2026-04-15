import { ForbiddenException } from '@nestjs/common';
import { PermissionGuard } from './permission.guard';

function createContext(permissions: string[] = []) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          permissions,
        },
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

  let guard: PermissionGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new PermissionGuard(reflector as never);
  });

  it('allows public routes', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows requests with required permissions', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(['admin:users:view']);

    expect(guard.canActivate(createContext(['admin:users:view']))).toBe(true);
  });

  it('rejects requests without required permissions', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(['admin:users:view']);

    expect(() => guard.canActivate(createContext([]))).toThrow(
      new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: 'Permission denied',
        requiredPermissions: ['admin:users:view'],
      }),
    );
  });
});
