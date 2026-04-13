"use server";

import { redirect } from "next/navigation";
import { adminRoutes } from "@/src/lib/admin-routes";
import { createSession } from "@/src/lib/session";

export type LoginFormState = {
  ok: boolean;
  error: "invalid" | "unavailable" | null;
};

function resolveStatus(error: unknown) {
  if (typeof error === "object" && error && "status" in error) {
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : null;
  }
  return null;
}

export async function loginAction(
  _state: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    return {
      ok: false,
      error: "invalid",
    };
  }

  try {
    await createSession({
      email,
      password,
    });
  } catch (error) {
    const status = resolveStatus(error);
    return {
      ok: false,
      error: status === 401 ? "invalid" : "unavailable",
    };
  }

  redirect(adminRoutes.dashboard);
}
