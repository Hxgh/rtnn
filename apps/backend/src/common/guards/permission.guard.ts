import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUDIT_ACTIONS } from '@rtnn/shared-types';
import { AuditWriter } from '../../modules/audit/audit-writer.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { REQUIRED_PERMISSIONS_KEY } from './require-permission.decorator';
import { AuthenticatedRequest } from './access-token.guard';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditWriter: AuditWriter,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const permissions = request.user?.permissions ?? [];
    const allowed = required.every((permission) =>
      permissions.includes(permission),
    );
    if (!allowed) {
      await this.writePermissionDeniedAudit(request, required);
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: 'Permission denied',
        requiredPermissions: required,
      });
    }
    return true;
  }

  private async writePermissionDeniedAudit(
    request: AuthenticatedRequest,
    requiredPermissions: string[],
  ): Promise<void> {
    try {
      const user = request.user;
      await this.auditWriter.write({
        actor: user
          ? {
              type: user.audience,
              accountId: user.sub,
              name: user.name,
            }
          : {
              type: 'system',
              name: 'system',
            },
        action: AUDIT_ACTIONS.authPermissionDenied,
        outcome: 'denied',
        resource: {
          type: 'system',
          name: `${request.method ?? 'HTTP'} ${request.path ?? request.url ?? ''}`,
        },
        context: {
          requestId: request.header('x-request-id') ?? undefined,
          ip: request.ip,
          userAgent: request.header('user-agent') ?? undefined,
        },
        detail: {
          method: request.method,
          path: request.path ?? request.url,
          requiredPermissions,
        },
      });
    } catch {
      // Authorization failures must keep the original 403 response.
    }
  }
}
