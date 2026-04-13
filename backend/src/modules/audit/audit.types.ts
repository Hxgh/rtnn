import { AuthAudience, Prisma } from '@prisma/client';
import { AuthSessionUser } from '../../common/guards/auth-session-user';

export interface AuditActor {
  type: AuthAudience | 'system';
  accountId?: string;
  name?: string;
  tenantId?: string | null;
}

export interface AuditResource {
  type: string;
  id?: string | null;
}

export interface AuditWriteInput {
  actor: AuditActor;
  action: string;
  resource: AuditResource;
  detail?: Prisma.InputJsonValue;
}

export function toAuditActor(user: AuthSessionUser): AuditActor {
  return {
    type: user.audience,
    accountId: user.sub,
    name: user.name,
  };
}
