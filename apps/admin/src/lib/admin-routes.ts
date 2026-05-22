import { API_PERMISSIONS, type PermissionKey } from "@rtnn/shared-types";
import type { AdminDictionary } from "@/src/i18n/dictionaries";

export const adminRoutes = {
  root: "/",
  login: "/login",
  forbidden: "/forbidden",
  dashboard: "/dashboard",
  customers: "/customers",
  account: "/account",
  users: {
    list: "/users",
    detail: (id: string) => `/users/${id}`,
  },
  roles: {
    list: "/roles",
    detail: (id: string) => `/roles/${id}`,
  },
  clientReleases: {
    list: "/client-releases",
    packages: "/client-releases/packages",
    detail: (id: string) => `/client-releases/${id}`,
  },
  auditLogs: "/audit-logs",
} as const;

export type AdminNavGroup = "workspace" | "business" | "access" | "system";

export type AdminNavIcon =
  | "dashboard"
  | "customers"
  | "users"
  | "roles"
  | "client-releases"
  | "audit-logs";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: AdminNavIcon;
  group: AdminNavGroup;
  permission?: PermissionKey;
};

export function buildAdminNavItems(
  dictionary: Pick<AdminDictionary, "nav">,
): AdminNavItem[] {
  return [
    {
      href: adminRoutes.dashboard,
      label: dictionary.nav.overview,
      icon: "dashboard",
      group: "workspace",
      permission: API_PERMISSIONS.adminDashboardView,
    },
    {
      href: adminRoutes.customers,
      label: dictionary.nav.customers,
      icon: "customers",
      group: "business",
      permission: API_PERMISSIONS.adminCustomersView,
    },
    {
      href: adminRoutes.users.list,
      label: dictionary.nav.users,
      icon: "users",
      group: "access",
      permission: API_PERMISSIONS.adminUsersView,
    },
    {
      href: adminRoutes.roles.list,
      label: dictionary.nav.roles,
      icon: "roles",
      group: "access",
      permission: API_PERMISSIONS.adminRolesView,
    },
    {
      href: adminRoutes.clientReleases.list,
      label: dictionary.nav.clientReleases,
      icon: "client-releases",
      group: "system",
      permission: API_PERMISSIONS.adminClientReleasesView,
    },
    {
      href: adminRoutes.auditLogs,
      label: dictionary.nav.auditLogs,
      icon: "audit-logs",
      group: "system",
      permission: API_PERMISSIONS.adminAuditLogsView,
    },
  ];
}

const adminStaticRouteSet = new Set<string>([
  adminRoutes.root,
  adminRoutes.login,
  adminRoutes.forbidden,
  adminRoutes.dashboard,
  adminRoutes.customers,
  adminRoutes.account,
  adminRoutes.users.list,
  adminRoutes.roles.list,
  adminRoutes.clientReleases.list,
  adminRoutes.clientReleases.packages,
  adminRoutes.auditLogs,
]);

export function isAdminRoutablePath(pathname: string) {
  if (
    pathname === "/users/new" ||
    pathname === "/roles/new" ||
    /^\/users\/[^/]+\/edit$/.test(pathname) ||
    /^\/roles\/[^/]+\/edit$/.test(pathname)
  ) {
    return false;
  }

  if (adminStaticRouteSet.has(pathname)) {
    return true;
  }

  if (/^\/users\/[^/]+$/.test(pathname)) {
    return true;
  }

  if (/^\/roles\/[^/]+$/.test(pathname)) {
    return true;
  }

  if (/^\/client-releases\/[^/]+$/.test(pathname)) {
    return true;
  }

  return false;
}

export function getAdminSegmentLabelMap(
  dictionary: Pick<AdminDictionary, "clientReleases" | "common" | "nav">,
) {
  return {
    dashboard: dictionary.nav.overview,
    customers: dictionary.nav.customers,
    users: dictionary.nav.users,
    roles: dictionary.nav.roles,
    "client-releases": dictionary.nav.clientReleases,
    packages: dictionary.clientReleases.packagesTitle,
    "audit-logs": dictionary.nav.auditLogs,
    account: dictionary.nav.account,
  } satisfies Record<string, string>;
}
