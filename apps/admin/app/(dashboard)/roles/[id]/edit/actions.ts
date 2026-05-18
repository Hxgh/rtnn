"use server";

import { redirect } from "next/navigation";
import { updateRole } from "@/src/lib/api-client";
import { adminRoutes } from "@/src/lib/admin-routes";
import { assertPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";

export async function updateRoleAction(id: string, formData: FormData) {
  const { me, accessToken } = await requireUserSession();
  assertPermission(me, "admin:roles:update");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const permissionKeys = formData
    .getAll("permissionKeys")
    .map((item) => String(item).trim())
    .filter(Boolean);

  await updateRole(accessToken, id, {
    name: name || undefined,
    description: description || undefined,
    permissionKeys,
  });
  redirect(adminRoutes.roles.detail(id));
}
