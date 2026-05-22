import { redirect } from "next/navigation";
import type { AuthUser, PermissionKey } from "@rtnn/shared-types";
import { adminRoutes } from "@/src/lib/admin-routes";

export function hasPermission(user: AuthUser, permission: PermissionKey) {
  return user.permissions.includes(permission);
}

export function assertPermission(user: AuthUser, permission: PermissionKey) {
  if (!hasPermission(user, permission)) {
    redirect(adminRoutes.forbidden);
  }
}
