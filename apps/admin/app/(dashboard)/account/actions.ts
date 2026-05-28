"use server";

import { changeAdminPassword } from "@/src/lib/api-client";
import { resolveErrorCode, resolveErrorStatus } from "@/src/lib/errors";
import { persistSessionTokens, requireUserSession } from "@/src/lib/session";

export type ChangePasswordFormState = {
  ok: boolean;
  error:
    | null
    | "required"
    | "mismatch"
    | "same-as-current"
    | "too-short"
    | "current-invalid"
    | "save-failed";
  fieldErrors: {
    currentPassword?: boolean;
    nextPassword?: boolean;
    confirmPassword?: boolean;
  };
};

export async function changePasswordAction(
  _state: ChangePasswordFormState,
  formData: FormData,
): Promise<ChangePasswordFormState> {
  const { accessToken } = await requireUserSession();

  const currentPassword = String(formData.get("currentPassword") ?? "").trim();
  const nextPassword = String(formData.get("nextPassword") ?? "").trim();
  const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

  const fieldErrors: ChangePasswordFormState["fieldErrors"] = {};

  if (!currentPassword) {
    fieldErrors.currentPassword = true;
  }
  if (!nextPassword) {
    fieldErrors.nextPassword = true;
  }
  if (!confirmPassword) {
    fieldErrors.confirmPassword = true;
  }
  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: "required",
      fieldErrors,
    };
  }

  if (nextPassword.length < 8) {
    return {
      ok: false,
      error: "too-short",
      fieldErrors: {
        nextPassword: true,
        confirmPassword: true,
      },
    };
  }

  if (currentPassword === nextPassword) {
    return {
      ok: false,
      error: "same-as-current",
      fieldErrors: {
        currentPassword: true,
        nextPassword: true,
      },
    };
  }

  if (nextPassword !== confirmPassword) {
    return {
      ok: false,
      error: "mismatch",
      fieldErrors: {
        nextPassword: true,
        confirmPassword: true,
      },
    };
  }

  try {
    const session = await changeAdminPassword(accessToken, {
      currentPassword,
      nextPassword,
    });
    await persistSessionTokens(session.tokens);
  } catch (error) {
    const status = resolveErrorStatus(error);
    const code = resolveErrorCode(error);
    const isCurrentInvalid = code === "OLD_PASSWORD_INVALID" || status === 401;
    const isSameAsCurrent = code === "NEW_PASSWORD_MUST_DIFFER";
    return {
      ok: false,
      error:
        isCurrentInvalid
          ? "current-invalid"
          : isSameAsCurrent
            ? "same-as-current"
            : "save-failed",
      fieldErrors: isCurrentInvalid
        ? {
            currentPassword: true,
          }
        : isSameAsCurrent
          ? {
              currentPassword: true,
              nextPassword: true,
            }
        : {},
    };
  }

  return {
    ok: true,
    error: null,
    fieldErrors: {},
  };
}
