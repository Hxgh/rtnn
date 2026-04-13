"use server";

import { redirect } from "next/navigation";
import { adminRoutes } from "@/src/lib/admin-routes";
import { logoutSession } from "@/src/lib/session";

export async function logoutAction() {
  await logoutSession();
  redirect(adminRoutes.login);
}
