import type { PermissionKey } from "@rtnn/shared-types";
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
    create: "/users/new",
    detail: (id: string) => `/users/${id}`,
    edit: (id: string) => `/users/${id}/edit`,
  },
  roles: {
    list: "/roles",
    create: "/roles/new",
    detail: (id: string) => `/roles/${id}`,
    edit: (id: string) => `/roles/${id}/edit`,
  },
  auditLogs: "/audit-logs",
} as const;

export type AdminNavGroup = "workspace" | "business" | "access" | "system";

export type AdminNavIcon =
  | "dashboard"
  | "customers"
  | "users"
  | "roles"
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
      permission: "admin:dashboard:view",
    },
    {
      href: adminRoutes.customers,
      label: dictionary.nav.customers,
      icon: "customers",
      group: "business",
      permission: "admin:customers:view",
    },
    {
      href: adminRoutes.users.list,
      label: dictionary.nav.users,
      icon: "users",
      group: "access",
      permission: "admin:users:view",
    },
    {
      href: adminRoutes.roles.list,
      label: dictionary.nav.roles,
      icon: "roles",
      group: "access",
      permission: "admin:roles:view",
    },
    {
      href: adminRoutes.auditLogs,
      label: dictionary.nav.auditLogs,
      icon: "audit-logs",
      group: "system",
      permission: "admin:audit-logs:view",
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
  adminRoutes.users.create,
  adminRoutes.roles.list,
  adminRoutes.roles.create,
  adminRoutes.auditLogs,
]);

export function isAdminRoutablePath(pathname: string) {
  if (adminStaticRouteSet.has(pathname)) {
    return true;
  }

  if (/^\/users\/[^/]+(?:\/edit)?$/.test(pathname)) {
    return true;
  }

  if (/^\/roles\/[^/]+(?:\/edit)?$/.test(pathname)) {
    return true;
  }

  return false;
}

export function getAdminSegmentLabelMap(
  dictionary: Pick<AdminDictionary, "common" | "nav">,
) {
  return {
    dashboard: dictionary.nav.overview,
    customers: dictionary.nav.customers,
    users: dictionary.nav.users,
    roles: dictionary.nav.roles,
    "audit-logs": dictionary.nav.auditLogs,
    account: dictionary.nav.account,
    new: dictionary.common.create,
    edit: dictionary.common.update,
  } satisfies Record<string, string>;
}
