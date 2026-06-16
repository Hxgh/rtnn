import type { PaginationQuery } from "./pagination";

export type AuditActorType = "admin" | "customer" | "system";
export type AuditCategory =
  | "system"
  | "auth"
  | "iam"
  | "customers"
  | "client-releases";
export type AuditOutcome = "success" | "failure" | "denied" | "rate_limited";
export type AuditResourceType =
  | "system"
  | "account"
  | "admin-user"
  | "role"
  | "customer"
  | "customer-group"
  | "customer-tag"
  | "client-release-policy";

export const AUDIT_CATEGORIES = [
  "system",
  "auth",
  "iam",
  "customers",
  "client-releases",
] as const satisfies readonly AuditCategory[];

export const AUDIT_OUTCOMES = [
  "success",
  "failure",
  "denied",
  "rate_limited",
] as const satisfies readonly AuditOutcome[];

export const AUDIT_RESOURCE_TYPES = [
  "system",
  "account",
  "admin-user",
  "role",
  "customer",
  "customer-group",
  "customer-tag",
  "client-release-policy",
] as const satisfies readonly AuditResourceType[];

export const AUDIT_ACTIONS = {
  authLoginFailed: "auth.login.failed",
  authLoginRateLimited: "auth.login.rate_limited",
  authPermissionDenied: "auth.permission.denied",
  accountPasswordChange: "account.password.change",
  adminUserCreate: "admin.user.create",
  adminUserUpdate: "admin.user.update",
  adminUserRolesUpdate: "admin.user.roles.update",
  adminRoleCreate: "admin.role.create",
  adminRoleUpdate: "admin.role.update",
  adminRolePermissionsUpdate: "admin.role.permissions.update",
  adminCustomerCreate: "admin.customer.create",
  adminCustomerUpdate: "admin.customer.update",
  adminCustomerStatusUpdate: "admin.customer.status.update",
  adminCustomerPasswordReset: "admin.customer.password.reset",
  adminCustomerGroupCreate: "admin.customer-group.create",
  adminCustomerGroupUpdate: "admin.customer-group.update",
  adminCustomerTagCreate: "admin.customer-tag.create",
  adminCustomerTagUpdate: "admin.customer-tag.update",
  adminClientReleasePolicyUpdate: "admin.client-release-policy.update",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export interface AuditActionDefinition {
  action: AuditAction;
  category: AuditCategory;
  defaultResourceType: AuditResourceType;
  sensitive: boolean;
  labelKey: string;
}

export const AUDIT_ACTION_DEFINITIONS = [
  {
    action: AUDIT_ACTIONS.authLoginFailed,
    category: "auth",
    defaultResourceType: "account",
    sensitive: true,
    labelKey: "audit.action.auth.login.failed",
  },
  {
    action: AUDIT_ACTIONS.authLoginRateLimited,
    category: "auth",
    defaultResourceType: "account",
    sensitive: true,
    labelKey: "audit.action.auth.login.rateLimited",
  },
  {
    action: AUDIT_ACTIONS.authPermissionDenied,
    category: "auth",
    defaultResourceType: "system",
    sensitive: true,
    labelKey: "audit.action.auth.permission.denied",
  },
  {
    action: AUDIT_ACTIONS.accountPasswordChange,
    category: "auth",
    defaultResourceType: "account",
    sensitive: true,
    labelKey: "audit.action.account.password.change",
  },
  {
    action: AUDIT_ACTIONS.adminUserCreate,
    category: "iam",
    defaultResourceType: "admin-user",
    sensitive: true,
    labelKey: "audit.action.admin.user.create",
  },
  {
    action: AUDIT_ACTIONS.adminUserUpdate,
    category: "iam",
    defaultResourceType: "admin-user",
    sensitive: true,
    labelKey: "audit.action.admin.user.update",
  },
  {
    action: AUDIT_ACTIONS.adminUserRolesUpdate,
    category: "iam",
    defaultResourceType: "admin-user",
    sensitive: true,
    labelKey: "audit.action.admin.user.roles.update",
  },
  {
    action: AUDIT_ACTIONS.adminRoleCreate,
    category: "iam",
    defaultResourceType: "role",
    sensitive: false,
    labelKey: "audit.action.admin.role.create",
  },
  {
    action: AUDIT_ACTIONS.adminRoleUpdate,
    category: "iam",
    defaultResourceType: "role",
    sensitive: false,
    labelKey: "audit.action.admin.role.update",
  },
  {
    action: AUDIT_ACTIONS.adminRolePermissionsUpdate,
    category: "iam",
    defaultResourceType: "role",
    sensitive: true,
    labelKey: "audit.action.admin.role.permissions.update",
  },
  {
    action: AUDIT_ACTIONS.adminCustomerCreate,
    category: "customers",
    defaultResourceType: "customer",
    sensitive: true,
    labelKey: "audit.action.admin.customer.create",
  },
  {
    action: AUDIT_ACTIONS.adminCustomerUpdate,
    category: "customers",
    defaultResourceType: "customer",
    sensitive: true,
    labelKey: "audit.action.admin.customer.update",
  },
  {
    action: AUDIT_ACTIONS.adminCustomerStatusUpdate,
    category: "customers",
    defaultResourceType: "customer",
    sensitive: false,
    labelKey: "audit.action.admin.customer.status.update",
  },
  {
    action: AUDIT_ACTIONS.adminCustomerPasswordReset,
    category: "customers",
    defaultResourceType: "customer",
    sensitive: true,
    labelKey: "audit.action.admin.customer.password.reset",
  },
  {
    action: AUDIT_ACTIONS.adminCustomerGroupCreate,
    category: "customers",
    defaultResourceType: "customer-group",
    sensitive: false,
    labelKey: "audit.action.admin.customerGroup.create",
  },
  {
    action: AUDIT_ACTIONS.adminCustomerGroupUpdate,
    category: "customers",
    defaultResourceType: "customer-group",
    sensitive: false,
    labelKey: "audit.action.admin.customerGroup.update",
  },
  {
    action: AUDIT_ACTIONS.adminCustomerTagCreate,
    category: "customers",
    defaultResourceType: "customer-tag",
    sensitive: false,
    labelKey: "audit.action.admin.customerTag.create",
  },
  {
    action: AUDIT_ACTIONS.adminCustomerTagUpdate,
    category: "customers",
    defaultResourceType: "customer-tag",
    sensitive: false,
    labelKey: "audit.action.admin.customerTag.update",
  },
  {
    action: AUDIT_ACTIONS.adminClientReleasePolicyUpdate,
    category: "client-releases",
    defaultResourceType: "client-release-policy",
    sensitive: false,
    labelKey: "audit.action.admin.clientReleasePolicy.update",
  },
] as const satisfies readonly AuditActionDefinition[];

export interface AuditLogItem {
  id: string;
  action: AuditAction | string;
  category: AuditCategory;
  outcome: AuditOutcome;
  actorType: AuditActorType;
  actorId?: string | null;
  actorName: string;
  resourceType: AuditResourceType | string;
  resourceId?: string | null;
  resourceName?: string | null;
  requestId?: string | null;
  detail?: Record<string, unknown> | null;
  schemaVersion: number;
  createdAt: string;
}

export interface AuditLogListQuery extends PaginationQuery {
  search?: string;
  actorType?: AuditActorType;
  action?: string;
  category?: AuditCategory;
  outcome?: AuditOutcome;
  resourceType?: AuditResourceType | string;
  resourceId?: string;
  from?: string;
  to?: string;
}
