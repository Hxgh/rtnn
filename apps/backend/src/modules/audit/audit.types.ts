import { AuthAudience, Prisma } from '@prisma/client';
import type {
  AuditAction,
  AuditOutcome,
  AuditResourceType,
} from '@rtnn/shared-types';
import { AuthSessionUser } from '../../common/guards/auth-session-user';

export interface AuditActor {
  type: AuthAudience | 'system';
  accountId?: string;
  name?: string;
  tenantId?: string | null;
}

export interface AuditResource {
  type: AuditResourceType;
  id?: string | null;
  name?: string | null;
}

export interface AuditRequestContext {
  requestId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface AuditWriteInput {
  actor: AuditActor;
  action: AuditAction;
  resource: AuditResource;
  outcome?: AuditOutcome;
  context?: AuditRequestContext;
  detail?: Prisma.InputJsonValue;
}

export function toAuditActor(user: AuthSessionUser): AuditActor {
  return {
    type: user.audience,
    accountId: user.sub,
    name: user.name,
  };
}
