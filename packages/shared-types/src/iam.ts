import type { PermissionKey } from "./permissions.generated";
import type { AccountStatus, AuthAudience, UserRole } from "./auth";
import type { PaginationQuery } from "./pagination";

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
