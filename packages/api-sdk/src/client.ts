import { createFetchTransport, type ApiTransport } from "./transport";
import type {
  AdminChangePasswordBody,
  AdminChangePasswordResult,
  AdminLoginBody,
  AdminLoginResult,
  AdminLogoutBody,
  AdminLogoutResult,
  AdminMeResult,
  AdminRefreshBody,
  AdminRefreshResult,
  AdminUserPathParams,
  AdminUsersCreateBody,
  AdminUsersCreateResult,
  AdminUsersGetResult,
  AdminUsersListQuery,
  AdminUsersListResult,
  AdminUsersUpdateBody,
  AdminUsersUpdateResult,
  AuditLogsListQuery,
  AuditLogsListResult,
  CustomerChangePasswordBody,
  CustomerChangePasswordResult,
  CustomerGroupPathParams,
  CustomerGroupsCreateBody,
  CustomerGroupsCreateResult,
  CustomerGroupsListQuery,
  CustomerGroupsListResult,
  CustomerGroupsUpdateBody,
  CustomerGroupsUpdateResult,
  CustomerLoginBody,
  CustomerLoginResult,
  CustomerLogoutBody,
  CustomerLogoutResult,
  CustomerMeResult,
  CustomerPathParams,
  CustomerRefreshBody,
  CustomerRefreshResult,
  CustomersCreateBody,
  CustomersCreateResult,
  CustomersGetResult,
  CustomersListQuery,
  CustomersListResult,
  CustomersResetPasswordBody,
  CustomersResetPasswordResult,
  CustomersUpdateBody,
  CustomersUpdateResult,
  CustomerTagPathParams,
  CustomerTagsCreateBody,
  CustomerTagsCreateResult,
  CustomerTagsListQuery,
  CustomerTagsListResult,
  CustomerTagsUpdateBody,
  CustomerTagsUpdateResult,
  DashboardStatsResult,
  PermissionsListResult,
  RolePathParams,
  RolesCreateBody,
  RolesCreateResult,
  RolesGetResult,
  RolesListQuery,
  RolesListResult,
  RolesUpdateBody,
  RolesUpdateResult,
} from "./openapi-contract";

type TransportQuery = Record<
  string,
  string | number | boolean | null | (string | number | boolean | null)[] | undefined
>;

const byIdPath = (template: string, id: string) =>
  template.replace("{id}", encodeURIComponent(id));

export interface ApiClient {
  auth: {
    admin: {
      login(body: AdminLoginBody): Promise<AdminLoginResult>;
      refresh(body: AdminRefreshBody): Promise<AdminRefreshResult>;
      logout(body: AdminLogoutBody): Promise<AdminLogoutResult>;
      me(): Promise<AdminMeResult>;
      changePassword(body: AdminChangePasswordBody): Promise<AdminChangePasswordResult>;
    };
    customer: {
      login(body: CustomerLoginBody): Promise<CustomerLoginResult>;
      refresh(body: CustomerRefreshBody): Promise<CustomerRefreshResult>;
      logout(body: CustomerLogoutBody): Promise<CustomerLogoutResult>;
      me(): Promise<CustomerMeResult>;
      changePassword(
        body: CustomerChangePasswordBody,
      ): Promise<CustomerChangePasswordResult>;
    };
  };
  dashboard: {
    getStats(): Promise<DashboardStatsResult>;
  };
  admin: {
    users: {
      list(query?: AdminUsersListQuery): Promise<AdminUsersListResult>;
      get(id: AdminUserPathParams["id"]): Promise<AdminUsersGetResult>;
      create(body: AdminUsersCreateBody): Promise<AdminUsersCreateResult>;
      update(
        id: AdminUserPathParams["id"],
        body: AdminUsersUpdateBody,
      ): Promise<AdminUsersUpdateResult>;
    };
    roles: {
      list(query?: RolesListQuery): Promise<RolesListResult>;
      get(id: RolePathParams["id"]): Promise<RolesGetResult>;
      create(body: RolesCreateBody): Promise<RolesCreateResult>;
      update(id: RolePathParams["id"], body: RolesUpdateBody): Promise<RolesUpdateResult>;
    };
    permissions: {
      list(): Promise<PermissionsListResult>;
    };
    customers: {
      list(query?: CustomersListQuery): Promise<CustomersListResult>;
      get(id: CustomerPathParams["id"]): Promise<CustomersGetResult>;
      create(body: CustomersCreateBody): Promise<CustomersCreateResult>;
      update(
        id: CustomerPathParams["id"],
        body: CustomersUpdateBody,
      ): Promise<CustomersUpdateResult>;
      resetPassword(
        id: CustomerPathParams["id"],
        body: CustomersResetPasswordBody,
      ): Promise<CustomersResetPasswordResult>;
    };
    customerGroups: {
      list(query?: CustomerGroupsListQuery): Promise<CustomerGroupsListResult>;
      create(body: CustomerGroupsCreateBody): Promise<CustomerGroupsCreateResult>;
      update(
        id: CustomerGroupPathParams["id"],
        body: CustomerGroupsUpdateBody,
      ): Promise<CustomerGroupsUpdateResult>;
    };
    customerTags: {
      list(query?: CustomerTagsListQuery): Promise<CustomerTagsListResult>;
      create(body: CustomerTagsCreateBody): Promise<CustomerTagsCreateResult>;
      update(
        id: CustomerTagPathParams["id"],
        body: CustomerTagsUpdateBody,
      ): Promise<CustomerTagsUpdateResult>;
    };
    auditLogs: {
      list(query?: AuditLogsListQuery): Promise<AuditLogsListResult>;
    };
  };
}

export const createApiClient = (transport: ApiTransport): ApiClient => ({
  auth: {
    admin: {
      login: (body) =>
        transport.request<AdminLoginResult, AdminLoginBody>({
          method: "POST",
          path: "/api/v1/auth/admin/login",
          body,
        }),
      refresh: (body) =>
        transport.request<AdminRefreshResult, AdminRefreshBody>({
          method: "POST",
          path: "/api/v1/auth/admin/refresh",
          body,
        }),
      logout: (body) =>
        transport.request<AdminLogoutResult, AdminLogoutBody>({
          method: "POST",
          path: "/api/v1/auth/admin/logout",
          body,
        }),
      me: () =>
        transport.request<AdminMeResult>({
          method: "GET",
          path: "/api/v1/auth/admin/me",
        }),
      changePassword: (body) =>
        transport.request<AdminChangePasswordResult, AdminChangePasswordBody>({
          method: "POST",
          path: "/api/v1/auth/admin/change-password",
          body,
        }),
    },
    customer: {
      login: (body) =>
        transport.request<CustomerLoginResult, CustomerLoginBody>({
          method: "POST",
          path: "/api/v1/auth/customer/login",
          body,
        }),
      refresh: (body) =>
        transport.request<CustomerRefreshResult, CustomerRefreshBody>({
          method: "POST",
          path: "/api/v1/auth/customer/refresh",
          body,
        }),
      logout: (body) =>
        transport.request<CustomerLogoutResult, CustomerLogoutBody>({
          method: "POST",
          path: "/api/v1/auth/customer/logout",
          body,
        }),
      me: () =>
        transport.request<CustomerMeResult>({
          method: "GET",
          path: "/api/v1/auth/customer/me",
        }),
      changePassword: (body) =>
        transport.request<
          CustomerChangePasswordResult,
          CustomerChangePasswordBody
        >({
          method: "POST",
          path: "/api/v1/auth/customer/change-password",
          body,
        }),
    },
  },
  dashboard: {
    getStats: () =>
      transport.request<DashboardStatsResult>({
        method: "GET",
        path: "/api/v1/admin/dashboard/stats",
      }),
  },
  admin: {
    users: {
      list: (query) =>
        transport.request<AdminUsersListResult>({
          method: "GET",
          path: "/api/v1/admin/users",
          query: query as TransportQuery | undefined,
        }),
      get: (id) =>
        transport.request<AdminUsersGetResult>({
          method: "GET",
          path: byIdPath("/api/v1/admin/users/{id}", id),
        }),
      create: (body) =>
        transport.request<AdminUsersCreateResult, AdminUsersCreateBody>({
          method: "POST",
          path: "/api/v1/admin/users",
          body,
        }),
      update: (id, body) =>
        transport.request<AdminUsersUpdateResult, AdminUsersUpdateBody>({
          method: "PATCH",
          path: byIdPath("/api/v1/admin/users/{id}", id),
          body,
        }),
    },
    roles: {
      list: (query) =>
        transport.request<RolesListResult>({
          method: "GET",
          path: "/api/v1/admin/roles",
          query: query as TransportQuery | undefined,
        }),
      get: (id) =>
        transport.request<RolesGetResult>({
          method: "GET",
          path: byIdPath("/api/v1/admin/roles/{id}", id),
        }),
      create: (body) =>
        transport.request<RolesCreateResult, RolesCreateBody>({
          method: "POST",
          path: "/api/v1/admin/roles",
          body,
        }),
      update: (id, body) =>
        transport.request<RolesUpdateResult, RolesUpdateBody>({
          method: "PATCH",
          path: byIdPath("/api/v1/admin/roles/{id}", id),
          body,
        }),
    },
    permissions: {
      list: () =>
        transport.request<PermissionsListResult>({
          method: "GET",
          path: "/api/v1/admin/permissions",
        }),
    },
    customers: {
      list: (query) =>
        transport.request<CustomersListResult>({
          method: "GET",
          path: "/api/v1/admin/customers",
          query: query as TransportQuery | undefined,
        }),
      get: (id) =>
        transport.request<CustomersGetResult>({
          method: "GET",
          path: byIdPath("/api/v1/admin/customers/{id}", id),
        }),
      create: (body) =>
        transport.request<CustomersCreateResult, CustomersCreateBody>({
          method: "POST",
          path: "/api/v1/admin/customers",
          body,
        }),
      update: (id, body) =>
        transport.request<CustomersUpdateResult, CustomersUpdateBody>({
          method: "PATCH",
          path: byIdPath("/api/v1/admin/customers/{id}", id),
          body,
        }),
      resetPassword: (id, body) =>
        transport.request<
          CustomersResetPasswordResult,
          CustomersResetPasswordBody
        >({
          method: "POST",
          path: byIdPath("/api/v1/admin/customers/{id}/reset-password", id),
          body,
        }),
    },
    customerGroups: {
      list: (query) =>
        transport.request<CustomerGroupsListResult>({
          method: "GET",
          path: "/api/v1/admin/customer-groups",
          query: query as TransportQuery | undefined,
        }),
      create: (body) =>
        transport.request<CustomerGroupsCreateResult, CustomerGroupsCreateBody>({
          method: "POST",
          path: "/api/v1/admin/customer-groups",
          body,
        }),
      update: (id, body) =>
        transport.request<CustomerGroupsUpdateResult, CustomerGroupsUpdateBody>({
          method: "PATCH",
          path: byIdPath("/api/v1/admin/customer-groups/{id}", id),
          body,
        }),
    },
    customerTags: {
      list: (query) =>
        transport.request<CustomerTagsListResult>({
          method: "GET",
          path: "/api/v1/admin/customer-tags",
          query: query as TransportQuery | undefined,
        }),
      create: (body) =>
        transport.request<CustomerTagsCreateResult, CustomerTagsCreateBody>({
          method: "POST",
          path: "/api/v1/admin/customer-tags",
          body,
        }),
      update: (id, body) =>
        transport.request<CustomerTagsUpdateResult, CustomerTagsUpdateBody>({
          method: "PATCH",
          path: byIdPath("/api/v1/admin/customer-tags/{id}", id),
          body,
        }),
    },
    auditLogs: {
      list: (query) =>
        transport.request<AuditLogsListResult>({
          method: "GET",
          path: "/api/v1/admin/audit-logs",
          query: query as TransportQuery | undefined,
        }),
    },
  },
});

export interface AdminApiSdk {
  getMe(): Promise<AdminMeResult["user"]>;
}

export interface CustomerApiSdk {
  getMe(): Promise<CustomerMeResult["user"]>;
}

export interface AdminSdkOptions {
  baseUrl: string;
  accessToken?: string;
  credentials?: RequestCredentials;
}

const createAuthorizedClient = ({
  baseUrl,
  accessToken,
  credentials = "include",
}: AdminSdkOptions) =>
  createApiClient(
    createFetchTransport({
      baseUrl,
      credentials,
      getHeaders: () => {
        if (!accessToken) {
          return {} as Record<string, string>;
        }
        return {
          Authorization: `Bearer ${accessToken}`,
        };
      },
    }),
  );

export const createAdminSdk = ({
  baseUrl,
  accessToken,
  credentials = "include",
}: AdminSdkOptions): AdminApiSdk => {
  const client = createAuthorizedClient({ baseUrl, accessToken, credentials });
  return {
    async getMe() {
      return (await client.auth.admin.me()).user;
    },
  };
};

export const createCustomerSdk = ({
  baseUrl,
  accessToken,
  credentials = "include",
}: AdminSdkOptions): CustomerApiSdk => {
  const client = createAuthorizedClient({ baseUrl, accessToken, credentials });
  return {
    async getMe() {
      return (await client.auth.customer.me()).user;
    },
  };
};
