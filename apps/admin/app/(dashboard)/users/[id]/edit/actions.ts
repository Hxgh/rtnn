"use server";

import { redirect } from "next/navigation";
import { updateUser } from "@/src/lib/api-client";
import { adminRoutes } from "@/src/lib/admin-routes";
import { assertPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";

export async function updateUserAction(id: string, formData: FormData) {
  const { me, accessToken } = await requireUserSession();
  assertPermission(me, "admin:users:update");

  const name = String(formData.get("name") ?? "").trim();
  const status = String(formData.get("status") ?? "active") as
    | "active"
    | "disabled";
  const roleIds = formData
    .getAll("roleIds")
    .map((item) => String(item).trim())
    .filter(Boolean);

  await updateUser(accessToken, id, {
    name: name || undefined,
    status,
    roleIds,
  });

  redirect(adminRoutes.users.detail(id));
}
