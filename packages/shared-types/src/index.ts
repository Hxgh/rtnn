import type { PermissionKey } from "./permissions.generated";

export {
  API_PERMISSIONS,
  DEFAULT_PERMISSION_KEYS,
  PERMISSION_DEFINITIONS,
  PERMISSION_GROUPS,
} from "./permissions.generated";
export type {
  PermissionCode,
  PermissionDefinition,
  PermissionGroup,
  PermissionKey,
} from "./permissions.generated";

export type AuthAudience = "admin" | "customer";
export type AccountStatus = "active" | "disabled" | "locked";
export type CustomerStatus = "active" | "inactive" | "blocked";

export type UserRole =
  | "SUPER_ADMIN"
  | "OPS_ADMIN"
  | "CONTENT_EDITOR"
  | "CUSTOMER_MANAGER"
  | "VIEWER"
  | (string & {});

export type AuditActorType = "admin" | "customer" | "system";

export interface ApiErrorPayload {
  statusCode: number;
  error: string;
  message: string | string[];
  code?: string;
  timestamp: string;
  path: string;
  details?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface TenantSummary {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionSummary {
  id: string;
  key: PermissionKey;
  name: string;
  description?: string | null;
}

export interface RoleSummary {
  id: string;
  slug?: string;
  code?: UserRole;
  name: string;
  description?: string | null;
  tenantId?: string | null;
  permissionKeys?: PermissionKey[];
  permissions?: PermissionKey[];
  createdAt: string;
  updatedAt: string;
}

export interface AccountSummary {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  status: AccountStatus;
  audiences: AuthAudience[];
  tenantId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LabeledReference {
  id: string;
  name: string;
}

export interface AdminUserSummary {
  id: string;
  email: string;
  name: string;
  status: AccountStatus;
  roles: string[];
  roleIds?: string[];
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDetail extends AdminUserSummary {
  permissions: PermissionKey[];
  rolesDetailed: RoleSummary[];
}

export interface CustomerGroupSummary {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
  customerCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerTagSummary {
  id: string;
  name: string;
  color?: string | null;
  usageCount?: number;
  customerCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSummary {
  id: string;
  accountId: string;
  email: string;
  name: string;
  status: CustomerStatus;
  tenantId: string | null;
  phone?: string | null;
  groups: LabeledReference[];
  tags: LabeledReference[];
  groupNames?: string[];
  tagNames?: string[];
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDetail extends CustomerSummary {
  notes?: string | null;
}

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

export interface DashboardStats {
  totalAdminUsers: number;
  totalCustomers: number;
  totalRoles: number;
  suspendedCustomers: number;
  recentAuditCount: number;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  tokenType: "Bearer";
}

interface BaseSessionUser {
  audience: AuthAudience;
  id: string;
  email: string;
  name: string;
  tenantId?: string | null;
  permissions: PermissionKey[];
  roles: UserRole[];
}

export interface AdminSessionUser extends BaseSessionUser {
  audience: "admin";
  adminProfileId?: string;
}

export interface CustomerSessionUser extends BaseSessionUser {
  audience: "customer";
  customerProfileId?: string;
  status?: CustomerStatus;
  groupIds?: string[];
  tagIds?: string[];
}

export type UserSession = AdminSessionUser;
export type AuthUser = AdminSessionUser;

export interface AdminSessionResponse {
  user: AdminSessionUser;
  tokens: SessionTokens;
}

export interface CustomerSessionResponse {
  user: CustomerSessionUser;
  tokens: SessionTokens;
}

export type SessionResponse = AdminSessionResponse;

export interface AdminMeResponse {
  user: AdminSessionUser;
}

export interface CustomerMeResponse {
  user: CustomerSessionUser;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface CustomerLoginRequest {
  email: string;
  password: string;
}

export type LoginRequest = AdminLoginRequest;

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  nextPassword: string;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface AdminUserListQuery extends PaginationQuery {
  search?: string;
}

export interface RoleListQuery extends PaginationQuery {
  search?: string;
}

export interface LookupListQuery extends PaginationQuery {
  search?: string;
}

export interface CreateAdminUserInput {
  email: string;
  displayName?: string;
  name?: string;
  password: string;
  roleIds?: string[];
  status?: AccountStatus;
  tenantId?: string;
}

export interface UpdateAdminUserInput {
  displayName?: string;
  name?: string;
  password?: string;
  roleIds?: string[];
  status?: AccountStatus;
}

export interface CreateRoleInput {
  code?: UserRole;
  slug?: string;
  name: string;
  description?: string;
  permissionKeys?: PermissionKey[];
}

export interface UpdateRoleInput {
  slug?: string;
  name?: string;
  description?: string;
  permissionKeys?: PermissionKey[];
}

export interface CustomerListQuery extends PaginationQuery {
  search?: string;
  status?: CustomerStatus;
  groupId?: string;
  tagId?: string;
}

export interface CreateCustomerInput {
  email: string;
  name?: string;
  password: string;
  phone?: string;
  tenantId?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  password?: string;
  phone?: string;
}

export interface UpdateCustomerStatusInput {
  status: CustomerStatus;
}

export interface ResetCustomerPasswordInput {
  nextPassword: string;
}

export interface CreateCustomerGroupInput {
  name: string;
  slug?: string;
  description?: string;
}

export interface UpdateCustomerGroupInput {
  name?: string;
  slug?: string;
  description?: string;
}

export interface CreateCustomerTagInput {
  name: string;
  slug?: string;
  color?: string;
  description?: string;
}

export interface UpdateCustomerTagInput {
  name?: string;
  slug?: string;
  color?: string | null;
  description?: string;
}

export interface AuditLogListQuery extends PaginationQuery {
  search?: string;
  actorType?: AuditActorType;
  action?: string;
}
