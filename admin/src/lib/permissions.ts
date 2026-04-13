import { redirect } from "next/navigation";
import type { AuthUser, PermissionKey } from "@rtnn/shared-types";
import { adminRoutes } from "@/src/lib/admin-routes";

function normalizeRoleKey(role: string) {
  return role.replaceAll("-", "_").toUpperCase();
}

export function hasPermission(user: AuthUser, permission: PermissionKey) {
  if (user.roles.some((role) => normalizeRoleKey(role) === "SUPER_ADMIN")) {
    return true;
  }
  return user.permissions.includes(permission);
}

export function assertPermission(user: AuthUser, permission: PermissionKey) {
  if (!hasPermission(user, permission)) {
    redirect(adminRoutes.forbidden);
  }
}
