import {
  createApiClient,
  createFetchTransport,
  type AdminChangePasswordBody,
  type AdminUsersCreateBody,
  type AdminUsersListQuery,
  type AdminUsersUpdateBody,
  type AuditLogsListQuery,
  type ClientPackagesListQuery,
  type ClientReleasePolicyUpdateBody,
  type ClientReleasesListQuery,
  type CustomerGroupsCreateBody,
  type CustomerGroupsUpdateBody,
  type CustomersResetPasswordBody,
  type CustomersCreateBody,
  type CustomersListQuery,
  type CustomersUpdateBody,
  type CustomersUpdateStatusBody,
  type RolesCreateBody,
  type RolesListQuery,
  type RolesUpdateBody,
  type CustomerTagsCreateBody,
  type CustomerTagsUpdateBody,
} from "@rtnn/api-sdk";
import { ENV_KEYS, PORTS } from "@rtnn/config";
import { cookies, headers } from "next/headers";
import type {
  AdminLoginRequest,
  AdminSessionResponse,
  AdminUserDetail,
  AdminUserSummary,
  AuditLogItem,
  ClientPackageListItem,
  ClientReleaseDetail,
  ClientReleaseSummary,
  ClientUpdatePolicySummary,
  CustomerDetail,
  CustomerGroupSummary,
  CustomerSummary,
  CustomerTagSummary,
  DashboardStats,
  LookupListQuery,
  PaginatedResult as SharedPaginatedResult,
  PermissionSummary,
  RoleSummary,
} from "@rtnn/shared-types";
import {
  ADMIN_LOCALE_COOKIE,
  normalizeAdminLocale,
  resolveAdminLocaleFromAcceptLanguage,
} from "@/src/lib/preferences";

export type PaginatedResult<T> = SharedPaginatedResult<T>;
export type AdminUserRecord = AdminUserSummary;
export type AdminUserDetailRecord = AdminUserDetail;
export type RoleRecord = RoleSummary;
export type PermissionRecord = PermissionSummary;
export type AuditLogRecord = AuditLogItem;
export type ClientPackageRecord = ClientPackageListItem;
export type ClientReleaseRecord = ClientReleaseSummary;
export type ClientReleaseDetailRecord = ClientReleaseDetail;
export type ClientUpdatePolicyRecord = ClientUpdatePolicySummary;
export type CustomerRecord = CustomerSummary;
export type CustomerDetailRecord = CustomerDetail;
export type CustomerGroupRecord = CustomerGroupSummary;
export type CustomerTagRecord = CustomerTagSummary;

function getBaseUrl() {
  const envBase =
    process.env[ENV_KEYS.backendInternalBaseUrl] ??
    process.env[ENV_KEYS.backendBaseUrl] ??
    process.env[ENV_KEYS.backendPublicUrl];
  return envBase ?? `http://localhost:${PORTS.backend}`;
}

async function resolveAdminRequestLocale() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(ADMIN_LOCALE_COOKIE)?.value;
  if (cookieLocale) {
    return normalizeAdminLocale(cookieLocale);
  }

  const headerStore = await headers();
  return resolveAdminLocaleFromAcceptLanguage(
    headerStore.get("accept-language"),
  );
}

function buildTransport(accessToken?: string) {
  const baseUrl = getBaseUrl();
  return createFetchTransport({
    baseUrl,
    credentials: "include",
    getHeaders: async () => {
      const requestHeaders: Record<string, string> = {
        "accept-language": await resolveAdminRequestLocale(),
      };
      if (!accessToken) {
        return requestHeaders;
      }
      requestHeaders.authorization = `Bearer ${accessToken}`;
      return requestHeaders;
    },
  });
}

function createClient(accessToken?: string) {
  return createApiClient(buildTransport(accessToken));
}

export async function loginAdmin(
  credentials: AdminLoginRequest,
): Promise<AdminSessionResponse> {
  const client = createClient();
  return client.auth.admin.login(credentials) as Promise<AdminSessionResponse>;
}

export async function refreshAdminSession(
  refreshToken: string,
): Promise<AdminSessionResponse> {
  const client = createClient();
  return client.auth.admin.refresh({ refreshToken }) as Promise<AdminSessionResponse>;
}

export async function logoutAdmin(refreshToken?: string): Promise<void> {
  const client = createClient();
  await client.auth.admin.logout({ refreshToken });
}

export async function getMe(
  accessToken: string,
): Promise<AdminSessionResponse["user"]> {
  const client = createClient(accessToken);
  const result = await client.auth.admin.me();
  return result.user as AdminSessionResponse["user"];
}

export async function getDashboardStats(
  accessToken: string,
): Promise<DashboardStats> {
  const client = createClient(accessToken);
  return client.dashboard.getStats() as Promise<DashboardStats>;
}

export async function listUsers(
  accessToken: string,
  query?: AdminUsersListQuery,
): Promise<PaginatedResult<AdminUserRecord>> {
  const client = createClient(accessToken);
  return client.admin.users.list(query) as Promise<PaginatedResult<AdminUserRecord>>;
}

export async function getUserById(
  accessToken: string,
  id: string,
): Promise<AdminUserDetailRecord> {
  const client = createClient(accessToken);
  return client.admin.users.get(id) as Promise<AdminUserDetailRecord>;
}

export async function createUser(
  accessToken: string,
  payload: AdminUsersCreateBody,
): Promise<AdminUserDetailRecord> {
  const client = createClient(accessToken);
  return client.admin.users.create(payload) as Promise<AdminUserDetailRecord>;
}

export async function updateUser(
  accessToken: string,
  id: string,
  payload: AdminUsersUpdateBody,
): Promise<AdminUserDetailRecord> {
  const client = createClient(accessToken);
  return client.admin.users.update(id, payload) as Promise<AdminUserDetailRecord>;
}

export async function listRoles(
  accessToken: string,
  query?: RolesListQuery,
): Promise<PaginatedResult<RoleRecord>> {
  const client = createClient(accessToken);
  return client.admin.roles.list(query) as Promise<PaginatedResult<RoleRecord>>;
}

export async function getRoleById(accessToken: string, id: string): Promise<RoleRecord> {
  const client = createClient(accessToken);
  return client.admin.roles.get(id) as Promise<RoleRecord>;
}

export async function listPermissions(
  accessToken: string,
): Promise<PermissionRecord[]> {
  const client = createClient(accessToken);
  return client.admin.permissions.list() as Promise<PermissionRecord[]>;
}

export async function createRole(
  accessToken: string,
  payload: RolesCreateBody,
): Promise<RoleRecord> {
  const client = createClient(accessToken);
  return client.admin.roles.create(payload) as Promise<RoleRecord>;
}

export async function updateRole(
  accessToken: string,
  id: string,
  payload: RolesUpdateBody,
): Promise<RoleRecord> {
  const client = createClient(accessToken);
  return client.admin.roles.update(id, payload) as Promise<RoleRecord>;
}

export async function listAuditLogs(
  accessToken: string,
  query?: AuditLogsListQuery,
): Promise<PaginatedResult<AuditLogRecord>> {
  const client = createClient(accessToken);
  return client.admin.auditLogs.list(query) as Promise<PaginatedResult<AuditLogRecord>>;
}

export async function listClientReleases(
  accessToken: string,
  query?: ClientReleasesListQuery,
): Promise<PaginatedResult<ClientReleaseRecord>> {
  const client = createClient(accessToken);
  return client.admin.clientReleases.list(query) as Promise<PaginatedResult<ClientReleaseRecord>>;
}

export async function listClientPackages(
  accessToken: string,
  query?: ClientPackagesListQuery,
): Promise<PaginatedResult<ClientPackageRecord>> {
  const client = createClient(accessToken);
  return client.admin.clientReleases.listPackages(query) as Promise<PaginatedResult<ClientPackageRecord>>;
}

export async function getClientReleaseById(
  accessToken: string,
  id: string,
): Promise<ClientReleaseDetailRecord> {
  const client = createClient(accessToken);
  return client.admin.clientReleases.get(id) as Promise<ClientReleaseDetailRecord>;
}

export async function updateClientReleasePolicy(
  accessToken: string,
  releaseId: string,
  policyId: string,
  payload: ClientReleasePolicyUpdateBody,
): Promise<ClientUpdatePolicyRecord> {
  const client = createClient(accessToken);
  return client.admin.clientReleases.updatePolicy(
    releaseId,
    policyId,
    payload,
  ) as Promise<ClientUpdatePolicyRecord>;
}

export async function listCustomers(
  accessToken: string,
  query?: CustomersListQuery,
): Promise<PaginatedResult<CustomerRecord>> {
  const client = createClient(accessToken);
  return client.admin.customers.list(query) as Promise<PaginatedResult<CustomerRecord>>;
}

export async function createCustomer(
  accessToken: string,
  payload: CustomersCreateBody,
): Promise<CustomerDetailRecord> {
  const client = createClient(accessToken);
  return client.admin.customers.create(payload) as Promise<CustomerDetailRecord>;
}

export async function updateCustomer(
  accessToken: string,
  id: string,
  payload: CustomersUpdateBody,
): Promise<CustomerDetailRecord> {
  const client = createClient(accessToken);
  return client.admin.customers.update(id, payload) as Promise<CustomerDetailRecord>;
}

export async function updateCustomerStatus(
  accessToken: string,
  id: string,
  payload: CustomersUpdateStatusBody,
): Promise<CustomerDetailRecord> {
  const client = createClient(accessToken);
  return client.admin.customers.updateStatus(id, payload) as Promise<CustomerDetailRecord>;
}

export async function resetCustomerPassword(
  accessToken: string,
  id: string,
  payload: CustomersResetPasswordBody,
): Promise<{ success: true }> {
  const client = createClient(accessToken);
  return client.admin.customers.resetPassword(id, payload) as Promise<{ success: true }>;
}

export async function listCustomerGroups(
  accessToken: string,
  query?: LookupListQuery,
): Promise<PaginatedResult<CustomerGroupRecord>> {
  const client = createClient(accessToken);
  return client.admin.customerGroups.list(query) as Promise<PaginatedResult<CustomerGroupRecord>>;
}

export async function createCustomerGroup(
  accessToken: string,
  payload: CustomerGroupsCreateBody,
): Promise<CustomerGroupRecord> {
  const client = createClient(accessToken);
  return client.admin.customerGroups.create(payload) as Promise<CustomerGroupRecord>;
}

export async function updateCustomerGroup(
  accessToken: string,
  id: string,
  payload: CustomerGroupsUpdateBody,
): Promise<CustomerGroupRecord> {
  const client = createClient(accessToken);
  return client.admin.customerGroups.update(id, payload) as Promise<CustomerGroupRecord>;
}

export async function listCustomerTags(
  accessToken: string,
  query?: LookupListQuery,
): Promise<PaginatedResult<CustomerTagRecord>> {
  const client = createClient(accessToken);
  return client.admin.customerTags.list(query) as Promise<PaginatedResult<CustomerTagRecord>>;
}

export async function createCustomerTag(
  accessToken: string,
  payload: CustomerTagsCreateBody,
): Promise<CustomerTagRecord> {
  const client = createClient(accessToken);
  return client.admin.customerTags.create(payload) as Promise<CustomerTagRecord>;
}

export async function updateCustomerTag(
  accessToken: string,
  id: string,
  payload: CustomerTagsUpdateBody,
): Promise<CustomerTagRecord> {
  const client = createClient(accessToken);
  return client.admin.customerTags.update(id, payload) as Promise<CustomerTagRecord>;
}

export async function changeAdminPassword(
  accessToken: string,
  payload: AdminChangePasswordBody,
): Promise<AdminSessionResponse> {
  const client = createClient(accessToken);
  return client.auth.admin.changePassword(payload) as Promise<AdminSessionResponse>;
}
