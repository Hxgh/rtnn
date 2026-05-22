import type {
  AdminLoginRequest,
  AdminMeResponse,
  AdminSessionResponse,
  AdminUserDetail,
  AdminUserListQuery,
  AuditLogItem,
  AuditLogListQuery,
  ChangePasswordRequest,
  ClientDownloadInfo,
  ClientDownloadListQuery,
  ClientDownloadQuery,
  ClientPackageListItem,
  ClientPackageListQuery,
  ClientReleaseDetail,
  ClientReleaseListQuery,
  ClientReleaseSummary,
  ClientUpdateCheckInfo,
  ClientUpdateCheckQuery,
  ClientUpdatePolicySummary,
  CreateAdminUserInput,
  CreateCustomerGroupInput,
  CreateCustomerInput,
  CreateCustomerTagInput,
  CreateRoleInput,
  CustomerDetail,
  CustomerGroupSummary,
  CustomerListQuery,
  CustomerLoginRequest,
  CustomerMeResponse,
  CustomerSessionResponse,
  CustomerSummary,
  CustomerTagSummary,
  DashboardStats,
  LookupListQuery,
  LogoutRequest,
  PaginatedResult,
  PermissionSummary,
  RefreshRequest,
  RoleListQuery,
  RoleSummary,
  UpdateAdminUserInput,
  UpdateClientReleasePolicyInput,
  UpdateCustomerGroupInput,
  UpdateCustomerInput,
  UpdateCustomerStatusInput,
  UpdateCustomerTagInput,
  UpdateRoleInput,
} from "@rtnn/shared-types";
import type { paths as OpenApiPaths } from "./generated/openapi";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
type OpenApiPathKey = keyof OpenApiPaths & string;

type Operation<TPath extends string, TMethod extends HttpMethod> =
  TPath extends OpenApiPathKey
    ? TMethod extends keyof OpenApiPaths[TPath]
      ? OpenApiPaths[TPath][TMethod]
      : never
    : never;

type JsonBody<T> = T extends {
  content: { "application/json": infer TJson };
}
  ? TJson
  : never;

type ResponseOf<T> = T extends { responses: infer TResponses }
  ? TResponses
  : never;

type SuccessResponse<T> = T extends Record<PropertyKey, unknown>
  ? (200 extends keyof T ? T[200] : never) |
    (201 extends keyof T ? T[201] : never) |
    (202 extends keyof T ? T[202] : never) |
    (204 extends keyof T ? T[204] : never)
  : never;

type RequestBodyOf<T> = T extends { requestBody?: infer TRequestBody }
  ? JsonBody<TRequestBody>
  : never;

type ResponseBodyOf<T> = JsonBody<SuccessResponse<ResponseOf<T>>>;

type ParametersOf<T> = T extends { parameters: infer TParameters }
  ? TParameters
  : never;

type QueryOf<T> = ParametersOf<T> extends { query?: infer TQuery }
  ? TQuery
  : never;

type PathParamsOf<T> = ParametersOf<T> extends { path?: infer TPathParams }
  ? TPathParams
  : never;

type IsOpaqueGeneratedType<T> = [T] extends [never]
  ? true
  : unknown extends T
    ? keyof T extends never
      ? true
      : false
  : T extends Record<string, never>
    ? true
    : false;

type PreferOpenApi<TGenerated, TFallback> =
  IsOpaqueGeneratedType<TGenerated> extends true ? TFallback : TGenerated;

type AdminLoginOperation = Operation<"/api/v1/auth/admin/login", "post">;
type AdminRefreshOperation = Operation<"/api/v1/auth/admin/refresh", "post">;
type AdminLogoutOperation = Operation<"/api/v1/auth/admin/logout", "post">;
type AdminMeOperation = Operation<"/api/v1/auth/admin/me", "get">;
type AdminChangePasswordOperation = Operation<
  "/api/v1/auth/admin/change-password",
  "post"
>;

type CustomerLoginOperation = Operation<"/api/v1/auth/customer/login", "post">;
type CustomerRefreshOperation = Operation<"/api/v1/auth/customer/refresh", "post">;
type CustomerLogoutOperation = Operation<"/api/v1/auth/customer/logout", "post">;
type CustomerMeOperation = Operation<"/api/v1/auth/customer/me", "get">;
type CustomerChangePasswordOperation = Operation<
  "/api/v1/auth/customer/change-password",
  "post"
>;

type DashboardStatsOperation = Operation<"/api/v1/admin/dashboard/stats", "get">;

type AdminUsersListOperation = Operation<"/api/v1/admin/users", "get">;
type AdminUsersCreateOperation = Operation<"/api/v1/admin/users", "post">;
type AdminUsersGetOperation = Operation<"/api/v1/admin/users/{id}", "get">;
type AdminUsersUpdateOperation = Operation<"/api/v1/admin/users/{id}", "patch">;
type AdminUsersBindRolesOperation = Operation<
  "/api/v1/admin/users/{id}/roles",
  "post"
>;

type RolesListOperation = Operation<"/api/v1/admin/roles", "get">;
type RolesCreateOperation = Operation<"/api/v1/admin/roles", "post">;
type RolesGetOperation = Operation<"/api/v1/admin/roles/{id}", "get">;
type RolesUpdateOperation = Operation<"/api/v1/admin/roles/{id}", "patch">;
type RolesAssignPermissionsOperation = Operation<
  "/api/v1/admin/roles/{id}/permissions",
  "patch"
>;

type PermissionsListOperation = Operation<"/api/v1/admin/permissions", "get">;

type CustomersListOperation = Operation<"/api/v1/admin/customers", "get">;
type CustomersCreateOperation = Operation<"/api/v1/admin/customers", "post">;
type CustomersGetOperation = Operation<"/api/v1/admin/customers/{id}", "get">;
type CustomersUpdateOperation = Operation<"/api/v1/admin/customers/{id}", "patch">;
type CustomersUpdateStatusOperation = Operation<
  "/api/v1/admin/customers/{id}/status",
  "patch"
>;
type CustomersResetPasswordOperation = Operation<
  "/api/v1/admin/customers/{id}/reset-password",
  "post"
>;

type CustomerGroupsListOperation = Operation<"/api/v1/admin/customer-groups", "get">;
type CustomerGroupsCreateOperation = Operation<"/api/v1/admin/customer-groups", "post">;
type CustomerGroupsUpdateOperation = Operation<
  "/api/v1/admin/customer-groups/{id}",
  "patch"
>;

type CustomerTagsListOperation = Operation<"/api/v1/admin/customer-tags", "get">;
type CustomerTagsCreateOperation = Operation<"/api/v1/admin/customer-tags", "post">;
type CustomerTagsUpdateOperation = Operation<
  "/api/v1/admin/customer-tags/{id}",
  "patch"
>;

type AuditLogsListOperation = Operation<"/api/v1/admin/audit-logs", "get">;
type ClientReleasesListOperation = Operation<
  "/api/v1/admin/client-releases",
  "get"
>;
type ClientPackagesListOperation = Operation<
  "/api/v1/admin/client-releases/packages",
  "get"
>;
type ClientReleasesGetOperation = Operation<
  "/api/v1/admin/client-releases/{id}",
  "get"
>;
type ClientReleasePolicyUpdateOperation = Operation<
  "/api/v1/admin/client-releases/{releaseId}/policies/{policyId}",
  "patch"
>;
type ClientDownloadsListOperation = Operation<
  "/api/v1/client-downloads",
  "get"
>;
type ClientDownloadsLatestOperation = Operation<
  "/api/v1/client-downloads/latest",
  "get"
>;
type ClientUpdatesCheckOperation = Operation<
  "/api/v1/client-updates/check",
  "get"
>;

export type AdminLoginBody = PreferOpenApi<
  RequestBodyOf<AdminLoginOperation>,
  AdminLoginRequest
>;
export type AdminLoginResult = PreferOpenApi<
  ResponseBodyOf<AdminLoginOperation>,
  AdminSessionResponse
>;
export type AdminRefreshBody = PreferOpenApi<
  RequestBodyOf<AdminRefreshOperation>,
  RefreshRequest
>;
export type AdminRefreshResult = PreferOpenApi<
  ResponseBodyOf<AdminRefreshOperation>,
  AdminSessionResponse
>;
export type AdminLogoutBody = PreferOpenApi<
  RequestBodyOf<AdminLogoutOperation>,
  LogoutRequest
>;
export type AdminLogoutResult = PreferOpenApi<
  ResponseBodyOf<AdminLogoutOperation>,
  { success: true }
>;
export type AdminMeResult = PreferOpenApi<
  ResponseBodyOf<AdminMeOperation>,
  AdminMeResponse
>;
export type AdminChangePasswordBody = PreferOpenApi<
  RequestBodyOf<AdminChangePasswordOperation>,
  ChangePasswordRequest
>;
export type AdminChangePasswordResult = PreferOpenApi<
  ResponseBodyOf<AdminChangePasswordOperation>,
  AdminSessionResponse
>;

export type CustomerLoginBody = PreferOpenApi<
  RequestBodyOf<CustomerLoginOperation>,
  CustomerLoginRequest
>;
export type CustomerLoginResult = PreferOpenApi<
  ResponseBodyOf<CustomerLoginOperation>,
  CustomerSessionResponse
>;
export type CustomerRefreshBody = PreferOpenApi<
  RequestBodyOf<CustomerRefreshOperation>,
  RefreshRequest
>;
export type CustomerRefreshResult = PreferOpenApi<
  ResponseBodyOf<CustomerRefreshOperation>,
  CustomerSessionResponse
>;
export type CustomerLogoutBody = PreferOpenApi<
  RequestBodyOf<CustomerLogoutOperation>,
  LogoutRequest
>;
export type CustomerLogoutResult = PreferOpenApi<
  ResponseBodyOf<CustomerLogoutOperation>,
  { success: true }
>;
export type CustomerMeResult = PreferOpenApi<
  ResponseBodyOf<CustomerMeOperation>,
  CustomerMeResponse
>;
export type CustomerChangePasswordBody = PreferOpenApi<
  RequestBodyOf<CustomerChangePasswordOperation>,
  ChangePasswordRequest
>;
export type CustomerChangePasswordResult = PreferOpenApi<
  ResponseBodyOf<CustomerChangePasswordOperation>,
  CustomerSessionResponse
>;

export type DashboardStatsResult = PreferOpenApi<
  ResponseBodyOf<DashboardStatsOperation>,
  DashboardStats
>;

export type AdminUsersListQuery = PreferOpenApi<
  QueryOf<AdminUsersListOperation>,
  AdminUserListQuery
>;
export type AdminUsersListResult = PreferOpenApi<
  ResponseBodyOf<AdminUsersListOperation>,
  PaginatedResult<AdminUserDetail>
>;
export type AdminUsersCreateBody = PreferOpenApi<
  RequestBodyOf<AdminUsersCreateOperation>,
  CreateAdminUserInput
>;
export type AdminUsersCreateResult = PreferOpenApi<
  ResponseBodyOf<AdminUsersCreateOperation>,
  AdminUserDetail
>;
export type AdminUserPathParams = PreferOpenApi<
  PathParamsOf<AdminUsersGetOperation>,
  { id: string }
>;
export type AdminUsersGetResult = PreferOpenApi<
  ResponseBodyOf<AdminUsersGetOperation>,
  AdminUserDetail
>;
export type AdminUsersUpdateBody = PreferOpenApi<
  RequestBodyOf<AdminUsersUpdateOperation>,
  UpdateAdminUserInput
>;
export type AdminUsersUpdateResult = PreferOpenApi<
  ResponseBodyOf<AdminUsersUpdateOperation>,
  AdminUserDetail
>;
export type AdminUsersBindRolesBody = PreferOpenApi<
  RequestBodyOf<AdminUsersBindRolesOperation>,
  { roleIds?: string[]; roleSlugs?: string[] }
>;
export type AdminUsersBindRolesResult = PreferOpenApi<
  ResponseBodyOf<AdminUsersBindRolesOperation>,
  AdminUserDetail
>;

export type RolesListQuery = PreferOpenApi<
  QueryOf<RolesListOperation>,
  RoleListQuery
>;
export type RolesListResult = PreferOpenApi<
  ResponseBodyOf<RolesListOperation>,
  PaginatedResult<RoleSummary>
>;
export type RolesCreateBody = PreferOpenApi<
  RequestBodyOf<RolesCreateOperation>,
  CreateRoleInput
>;
export type RolesCreateResult = PreferOpenApi<
  ResponseBodyOf<RolesCreateOperation>,
  RoleSummary
>;
export type RolePathParams = PreferOpenApi<
  PathParamsOf<RolesGetOperation>,
  { id: string }
>;
export type RolesGetResult = PreferOpenApi<
  ResponseBodyOf<RolesGetOperation>,
  RoleSummary
>;
export type RolesUpdateBody = PreferOpenApi<
  RequestBodyOf<RolesUpdateOperation>,
  UpdateRoleInput
>;
export type RolesUpdateResult = PreferOpenApi<
  ResponseBodyOf<RolesUpdateOperation>,
  RoleSummary
>;
export type RolesAssignPermissionsBody = PreferOpenApi<
  RequestBodyOf<RolesAssignPermissionsOperation>,
  Pick<UpdateRoleInput, "permissionKeys">
>;
export type RolesAssignPermissionsResult = PreferOpenApi<
  ResponseBodyOf<RolesAssignPermissionsOperation>,
  RoleSummary
>;

export type PermissionsListResult = PreferOpenApi<
  ResponseBodyOf<PermissionsListOperation>,
  PermissionSummary[]
>;

export type CustomersListQuery = PreferOpenApi<
  QueryOf<CustomersListOperation>,
  CustomerListQuery
>;
export type CustomersListResult = PreferOpenApi<
  ResponseBodyOf<CustomersListOperation>,
  PaginatedResult<CustomerSummary>
>;
export type CustomersCreateBody = PreferOpenApi<
  RequestBodyOf<CustomersCreateOperation>,
  CreateCustomerInput
>;
export type CustomersCreateResult = PreferOpenApi<
  ResponseBodyOf<CustomersCreateOperation>,
  CustomerDetail
>;
export type CustomerPathParams = PreferOpenApi<
  PathParamsOf<CustomersGetOperation>,
  { id: string }
>;
export type CustomersGetResult = PreferOpenApi<
  ResponseBodyOf<CustomersGetOperation>,
  CustomerDetail
>;
export type CustomersUpdateBody = PreferOpenApi<
  RequestBodyOf<CustomersUpdateOperation>,
  UpdateCustomerInput
>;
export type CustomersUpdateResult = PreferOpenApi<
  ResponseBodyOf<CustomersUpdateOperation>,
  CustomerDetail
>;
export type CustomersUpdateStatusBody = PreferOpenApi<
  RequestBodyOf<CustomersUpdateStatusOperation>,
  UpdateCustomerStatusInput
>;
export type CustomersUpdateStatusResult = PreferOpenApi<
  ResponseBodyOf<CustomersUpdateStatusOperation>,
  CustomerDetail
>;
export type CustomersResetPasswordBody = PreferOpenApi<
  RequestBodyOf<CustomersResetPasswordOperation>,
  { nextPassword: string }
>;
export type CustomersResetPasswordResult = PreferOpenApi<
  ResponseBodyOf<CustomersResetPasswordOperation>,
  { success: true }
>;

export type CustomerGroupsListQuery = PreferOpenApi<
  QueryOf<CustomerGroupsListOperation>,
  LookupListQuery
>;
export type CustomerGroupsListResult = PreferOpenApi<
  ResponseBodyOf<CustomerGroupsListOperation>,
  PaginatedResult<CustomerGroupSummary>
>;
export type CustomerGroupsCreateBody = PreferOpenApi<
  RequestBodyOf<CustomerGroupsCreateOperation>,
  CreateCustomerGroupInput
>;
export type CustomerGroupsCreateResult = PreferOpenApi<
  ResponseBodyOf<CustomerGroupsCreateOperation>,
  CustomerGroupSummary
>;
export type CustomerGroupPathParams = PreferOpenApi<
  PathParamsOf<CustomerGroupsUpdateOperation>,
  { id: string }
>;
export type CustomerGroupsUpdateBody = PreferOpenApi<
  RequestBodyOf<CustomerGroupsUpdateOperation>,
  UpdateCustomerGroupInput
>;
export type CustomerGroupsUpdateResult = PreferOpenApi<
  ResponseBodyOf<CustomerGroupsUpdateOperation>,
  CustomerGroupSummary
>;

export type CustomerTagsListQuery = PreferOpenApi<
  QueryOf<CustomerTagsListOperation>,
  LookupListQuery
>;
export type CustomerTagsListResult = PreferOpenApi<
  ResponseBodyOf<CustomerTagsListOperation>,
  PaginatedResult<CustomerTagSummary>
>;
export type CustomerTagsCreateBody = PreferOpenApi<
  RequestBodyOf<CustomerTagsCreateOperation>,
  CreateCustomerTagInput
>;
export type CustomerTagsCreateResult = PreferOpenApi<
  ResponseBodyOf<CustomerTagsCreateOperation>,
  CustomerTagSummary
>;
export type CustomerTagPathParams = PreferOpenApi<
  PathParamsOf<CustomerTagsUpdateOperation>,
  { id: string }
>;
export type CustomerTagsUpdateBody = PreferOpenApi<
  RequestBodyOf<CustomerTagsUpdateOperation>,
  UpdateCustomerTagInput
>;
export type CustomerTagsUpdateResult = PreferOpenApi<
  ResponseBodyOf<CustomerTagsUpdateOperation>,
  CustomerTagSummary
>;

export type AuditLogsListQuery = PreferOpenApi<
  QueryOf<AuditLogsListOperation>,
  AuditLogListQuery
>;
export type AuditLogsListResult = PreferOpenApi<
  ResponseBodyOf<AuditLogsListOperation>,
  PaginatedResult<AuditLogItem>
>;

export type ClientReleasesListQuery = PreferOpenApi<
  QueryOf<ClientReleasesListOperation>,
  ClientReleaseListQuery
>;
export type ClientReleasesListResult = PreferOpenApi<
  ResponseBodyOf<ClientReleasesListOperation>,
  PaginatedResult<ClientReleaseSummary>
>;
export type ClientPackagesListQuery = PreferOpenApi<
  QueryOf<ClientPackagesListOperation>,
  ClientPackageListQuery
>;
export type ClientPackagesListResult = PreferOpenApi<
  ResponseBodyOf<ClientPackagesListOperation>,
  PaginatedResult<ClientPackageListItem>
>;
export type ClientReleasePathParams = PreferOpenApi<
  PathParamsOf<ClientReleasesGetOperation>,
  { id: string }
>;
export type ClientReleasesGetResult = PreferOpenApi<
  ResponseBodyOf<ClientReleasesGetOperation>,
  ClientReleaseDetail
>;
export type ClientReleasePolicyPathParams = PreferOpenApi<
  PathParamsOf<ClientReleasePolicyUpdateOperation>,
  { releaseId: string; policyId: string }
>;
export type ClientReleasePolicyUpdateBody = PreferOpenApi<
  RequestBodyOf<ClientReleasePolicyUpdateOperation>,
  UpdateClientReleasePolicyInput
>;
export type ClientReleasePolicyUpdateResult = PreferOpenApi<
  ResponseBodyOf<ClientReleasePolicyUpdateOperation>,
  ClientUpdatePolicySummary
>;
export type ClientDownloadsListQuery = PreferOpenApi<
  QueryOf<ClientDownloadsListOperation>,
  ClientDownloadListQuery
>;
export type ClientDownloadsListResult = PreferOpenApi<
  ResponseBodyOf<ClientDownloadsListOperation>,
  ClientDownloadInfo[]
>;
export type ClientDownloadsLatestQuery = PreferOpenApi<
  QueryOf<ClientDownloadsLatestOperation>,
  ClientDownloadQuery
>;
export type ClientDownloadsLatestResult = PreferOpenApi<
  ResponseBodyOf<ClientDownloadsLatestOperation>,
  ClientDownloadInfo
>;
export type ClientUpdatesCheckQuery = PreferOpenApi<
  QueryOf<ClientUpdatesCheckOperation>,
  ClientUpdateCheckQuery
>;
export type ClientUpdatesCheckResult = PreferOpenApi<
  ResponseBodyOf<ClientUpdatesCheckOperation>,
  ClientUpdateCheckInfo
>;
