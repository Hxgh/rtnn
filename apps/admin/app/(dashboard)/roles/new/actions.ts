"use server";

import { redirect } from "next/navigation";
import { createRole } from "@/src/lib/api-client";
import { adminRoutes } from "@/src/lib/admin-routes";
import { assertPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";

export async function createRoleAction(formData: FormData) {
  const { me, accessToken } = await requireUserSession();
  assertPermission(me, "admin:roles:create");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const permissionKeys = formData
    .getAll("permissionKeys")
    .map((item) => String(item).trim())
    .filter(Boolean);

  if (!name) {
    redirect(`${adminRoutes.roles.create}?error=required`);
  }

  await createRole(accessToken, {
    name,
    description: description || undefined,
    permissionKeys,
  });
  redirect(adminRoutes.roles.list);
}
