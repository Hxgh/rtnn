import type { ApiErrorCode } from "@rtnn/shared-types";
import { readWeappLocale } from "./preferences";
import { getWeappMessages } from "./i18n";

type ApiErrorPayload = {
  code?: ApiErrorCode;
  message?: string | string[];
};

function resolvePayload(error: unknown): ApiErrorPayload | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  if ("payload" in error) {
    const payload = (error as { payload?: unknown }).payload;
    if (payload && typeof payload === "object") {
      return payload as ApiErrorPayload;
    }
  }

  return error as ApiErrorPayload;
}

export function resolveWeappErrorCode(error: unknown): ApiErrorCode | null {
  const payload = resolvePayload(error);
  if (payload?.code && typeof payload.code === "string") {
    return payload.code as ApiErrorCode;
  }
  return null;
}

export function resolveWeappErrorMessage(error: unknown): string {
  const locale = readWeappLocale();
  const messages = getWeappMessages(locale);
  const payload = resolvePayload(error);
  const code = resolveWeappErrorCode(error);

  if (typeof payload?.message === "string" && payload.message.trim()) {
    return payload.message;
  }
  if (Array.isArray(payload?.message) && payload.message.length > 0) {
    return payload.message.map((item) => String(item)).join(", ");
  }
  const messageByCode: Partial<Record<ApiErrorCode, string>> = {
    INVALID_CREDENTIALS: messages.errors.loginFailed,
    LOGIN_RATE_LIMITED: messages.errors.loginFailed,
    INVALID_OR_EXPIRED_ACCESS_TOKEN: messages.errors.sessionUnavailable,
    INVALID_OR_EXPIRED_REFRESH_TOKEN: messages.errors.sessionUnavailable,
    SESSION_EXPIRED: messages.errors.sessionUnavailable,
    OLD_PASSWORD_INVALID: messages.errors.invalidCurrentPassword,
    NEW_PASSWORD_MUST_DIFFER: messages.errors.sameAsCurrentPassword,
    VALIDATION_FAILED: messages.errors.unknown,
  };
  if (code && messageByCode[code]) {
    return messageByCode[code];
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return messages.errors.unknown;
}
