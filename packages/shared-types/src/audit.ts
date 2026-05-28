import type { PaginationQuery } from "./pagination";

export type AuditActorType = "admin" | "customer" | "system";

export interface AuditLogItem {
  id: string;
  action: string;
  actorType: AuditActorType;
  actorId?: string | null;
  actorName: string;
  resourceType: string;
  resourceId?: string | null;
  detail?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogListQuery extends PaginationQuery {
  search?: string;
  actorType?: AuditActorType;
  action?: string;
}
