"use server";

import { redirect } from "next/navigation";
import { createApiClient, createFetchTransport } from "@rtnn/api-sdk";
import { getServerPreferencesFromRequest } from "@/lib/i18n/server";
import { persistSessionTokens } from "@/lib/server/auth-cookies";
import { resolveBaseUrl } from "@/lib/server/api-client";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/").trim() || "/";
  if (!email || !password) {
    redirect(`/login?error=required&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  try {
    const { locale } = await getServerPreferencesFromRequest();
    const transport = createFetchTransport({
      baseUrl: resolveBaseUrl(),
      credentials: "include",
      getHeaders: () => ({
        "accept-language": locale,
      }),
    });
    const client = createApiClient(transport);
    const session = await client.auth.customer.login({ email, password });
    if (!session?.tokens?.accessToken || !session.tokens.refreshToken) {
      throw new Error("登录未返回有效令牌");
    }

    await persistSessionTokens(session.tokens);
  } catch {
    redirect(`/login?error=invalid&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}
