"use server";

import { cookies } from "next/headers";
import type { ApiErrorCode } from "@rtnn/shared-types";
import { createServerApiClient } from "@/lib/server/api-client";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  persistSessionTokens,
} from "@/lib/server/auth-cookies";

type ApiError = Error & {
  status?: number;
  payload?: { code?: ApiErrorCode };
};

export type ChangePasswordState = {
  ok: boolean;
  error:
    | null
    | "required"
    | "mismatch"
    | "same-as-current"
    | "too-short"
    | "invalid-current"
    | "session-expired"
    | "failed";
};

export const initialChangePasswordState: ChangePasswordState = {
  ok: false,
  error: null,
};

async function canAttemptRefresh() {
  const cookieStore = await cookies();
  return Boolean(cookieStore.get(REFRESH_TOKEN_COOKIE)?.value);
}

export async function changePasswordAction(
  _state: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const currentPassword = String(formData.get("currentPassword") ?? "").trim();
  const nextPassword = String(formData.get("nextPassword") ?? "").trim();
  const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

  if (!currentPassword || !nextPassword || !confirmPassword) {
    return { ok: false, error: "required" };
  }

  if (nextPassword.length < 8) {
    return { ok: false, error: "too-short" };
  }

  if (nextPassword !== confirmPassword) {
    return { ok: false, error: "mismatch" };
  }

  if (currentPassword === nextPassword) {
    return { ok: false, error: "same-as-current" };
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return { ok: false, error: "session-expired" };
  }

  try {
    const client = await createServerApiClient({ accessToken });
    const session = await client.auth.customer.changePassword({
      currentPassword,
      nextPassword,
    });
    await persistSessionTokens(session.tokens);
    return { ok: true, error: null };
  } catch (error) {
    const apiError = error as ApiError;
    const code = apiError.payload?.code;
    const hasRefreshToken = await canAttemptRefresh();
    if (
      code === "SESSION_EXPIRED" ||
      (apiError.status === 401 && hasRefreshToken)
    ) {
      return { ok: false, error: "session-expired" };
    }
    if (code === "OLD_PASSWORD_INVALID" || apiError.status === 401) {
      return { ok: false, error: "invalid-current" };
    }
    if (code === "NEW_PASSWORD_MUST_DIFFER") {
      return { ok: false, error: "same-as-current" };
    }
    return { ok: false, error: "failed" };
  }
}
