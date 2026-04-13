import {
  createApiClient,
  createFetchTransport,
  type AdminChangePasswordBody,
  type AdminUsersCreateBody,
  type AdminUsersListQuery,
  type AdminUsersUpdateBody,
  type AuditLogsListQuery,
  type CustomersCreateBody,
  type CustomersListQuery,
  type CustomersUpdateBody,
  type RolesCreateBody,
  type RolesListQuery,
  type RolesUpdateBody,
} from "@rtnn/api-sdk";
import { PORTS } from "@rtnn/config";
import { cookies, headers } from "next/headers";
import type {
  AdminLoginRequest,
  AdminSessionResponse,
  AdminUserDetail,
  AdminUserSummary,
  AuditLogItem,
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
export type CustomerRecord = CustomerSummary;
export type CustomerDetailRecord = CustomerDetail;
export type CustomerGroupRecord = CustomerGroupSummary;
export type CustomerTagRecord = CustomerTagSummary;

function getBaseUrl() {
  const envBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL;
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

export async function listCustomerGroups(
  accessToken: string,
  query?: LookupListQuery,
): Promise<PaginatedResult<CustomerGroupRecord>> {
  const client = createClient(accessToken);
  return client.admin.customerGroups.list(query) as Promise<PaginatedResult<CustomerGroupRecord>>;
}

export async function listCustomerTags(
  accessToken: string,
  query?: LookupListQuery,
): Promise<PaginatedResult<CustomerTagRecord>> {
  const client = createClient(accessToken);
  return client.admin.customerTags.list(query) as Promise<PaginatedResult<CustomerTagRecord>>;
}

export async function changeAdminPassword(
  accessToken: string,
  payload: AdminChangePasswordBody,
): Promise<AdminSessionResponse> {
  const client = createClient(accessToken);
  return client.auth.admin.changePassword(payload) as Promise<AdminSessionResponse>;
}
