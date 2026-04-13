"use server";

import { redirect } from "next/navigation";
import { createUser } from "@/src/lib/api-client";
import { adminRoutes } from "@/src/lib/admin-routes";
import { assertPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";

export async function createUserAction(formData: FormData) {
  const { me, accessToken } = await requireUserSession();
  assertPermission(me, "admin:users:create");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const roleIds = formData
    .getAll("roleIds")
    .map((item) => String(item).trim())
    .filter(Boolean);

  if (!name || !email || !password) {
    redirect(`${adminRoutes.users.create}?error=required`);
  }

  await createUser(accessToken, { name, email, password, roleIds });
  redirect(adminRoutes.users.list);
}
