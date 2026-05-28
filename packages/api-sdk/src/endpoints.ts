export interface ApiEndpointSurfaceEntry {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  sdk: string;
}

export const API_SDK_ENDPOINT_SURFACE = [
  { method: "POST", path: "/api/v1/auth/admin/login", sdk: "auth.admin.login" },
  {
    method: "POST",
    path: "/api/v1/auth/admin/refresh",
    sdk: "auth.admin.refresh",
  },
  {
    method: "POST",
    path: "/api/v1/auth/admin/logout",
    sdk: "auth.admin.logout",
  },
  { method: "GET", path: "/api/v1/auth/admin/me", sdk: "auth.admin.me" },
  {
    method: "POST",
    path: "/api/v1/auth/admin/change-password",
    sdk: "auth.admin.changePassword",
  },
  {
    method: "POST",
    path: "/api/v1/auth/customer/login",
    sdk: "auth.customer.login",
  },
  {
    method: "POST",
    path: "/api/v1/auth/customer/refresh",
    sdk: "auth.customer.refresh",
  },
  {
    method: "POST",
    path: "/api/v1/auth/customer/logout",
    sdk: "auth.customer.logout",
  },
  { method: "GET", path: "/api/v1/auth/customer/me", sdk: "auth.customer.me" },
  {
    method: "POST",
    path: "/api/v1/auth/customer/change-password",
    sdk: "auth.customer.changePassword",
  },
  {
    method: "GET",
    path: "/api/v1/admin/dashboard/stats",
    sdk: "dashboard.getStats",
  },
  { method: "GET", path: "/api/v1/admin/users", sdk: "admin.users.list" },
  { method: "GET", path: "/api/v1/admin/users/{id}", sdk: "admin.users.get" },
  { method: "POST", path: "/api/v1/admin/users", sdk: "admin.users.create" },
  {
    method: "PATCH",
    path: "/api/v1/admin/users/{id}",
    sdk: "admin.users.update",
  },
  {
    method: "POST",
    path: "/api/v1/admin/users/{id}/roles",
    sdk: "admin.users.bindRoles",
  },
  { method: "GET", path: "/api/v1/admin/roles", sdk: "admin.roles.list" },
  { method: "GET", path: "/api/v1/admin/roles/{id}", sdk: "admin.roles.get" },
  { method: "POST", path: "/api/v1/admin/roles", sdk: "admin.roles.create" },
  {
    method: "PATCH",
    path: "/api/v1/admin/roles/{id}",
    sdk: "admin.roles.update",
  },
  {
    method: "PATCH",
    path: "/api/v1/admin/roles/{id}/permissions",
    sdk: "admin.roles.assignPermissions",
  },
  {
    method: "GET",
    path: "/api/v1/admin/permissions",
    sdk: "admin.permissions.list",
  },
  {
    method: "GET",
    path: "/api/v1/admin/customers",
    sdk: "admin.customers.list",
  },
  {
    method: "GET",
    path: "/api/v1/admin/customers/{id}",
    sdk: "admin.customers.get",
  },
  {
    method: "POST",
    path: "/api/v1/admin/customers",
    sdk: "admin.customers.create",
  },
  {
    method: "PATCH",
    path: "/api/v1/admin/customers/{id}",
    sdk: "admin.customers.update",
  },
  {
    method: "PATCH",
    path: "/api/v1/admin/customers/{id}/status",
    sdk: "admin.customers.updateStatus",
  },
  {
    method: "POST",
    path: "/api/v1/admin/customers/{id}/reset-password",
    sdk: "admin.customers.resetPassword",
  },
  {
    method: "GET",
    path: "/api/v1/admin/customer-groups",
    sdk: "admin.customerGroups.list",
  },
  {
    method: "POST",
    path: "/api/v1/admin/customer-groups",
    sdk: "admin.customerGroups.create",
  },
  {
    method: "PATCH",
    path: "/api/v1/admin/customer-groups/{id}",
    sdk: "admin.customerGroups.update",
  },
  {
    method: "GET",
    path: "/api/v1/admin/customer-tags",
    sdk: "admin.customerTags.list",
  },
  {
    method: "POST",
    path: "/api/v1/admin/customer-tags",
    sdk: "admin.customerTags.create",
  },
  {
    method: "PATCH",
    path: "/api/v1/admin/customer-tags/{id}",
    sdk: "admin.customerTags.update",
  },
  {
    method: "GET",
    path: "/api/v1/admin/audit-logs",
    sdk: "admin.auditLogs.list",
  },
  {
    method: "GET",
    path: "/api/v1/admin/client-releases",
    sdk: "admin.clientReleases.list",
  },
  {
    method: "GET",
    path: "/api/v1/admin/client-releases/packages",
    sdk: "admin.clientReleases.listPackages",
  },
  {
    method: "GET",
    path: "/api/v1/admin/client-releases/{id}",
    sdk: "admin.clientReleases.get",
  },
  {
    method: "PATCH",
    path: "/api/v1/admin/client-releases/{releaseId}/policies/{policyId}",
    sdk: "admin.clientReleases.updatePolicy",
  },
  {
    method: "GET",
    path: "/api/v1/client-downloads",
    sdk: "clientDownloads.list",
  },
  {
    method: "GET",
    path: "/api/v1/client-downloads/latest",
    sdk: "clientDownloads.latest",
  },
  {
    method: "GET",
    path: "/api/v1/client-updates/check",
    sdk: "clientUpdates.check",
  },
] as const satisfies readonly ApiEndpointSurfaceEntry[];

export const INTENTIONALLY_UNWRAPPED_OPENAPI_ENDPOINTS = [
  {
    method: "POST",
    path: "/api/v1/internal/client-release-facts",
    reason: "Internal deploy executor callback guarded by a facts token.",
  },
  { method: "GET", path: "/healthz", reason: "Runtime probe." },
  { method: "GET", path: "/readyz", reason: "Runtime probe." },
  { method: "GET", path: "/version", reason: "Runtime release metadata." },
] as const;
