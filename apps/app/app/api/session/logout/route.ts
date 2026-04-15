import { redirect } from "next/navigation";
import { PUBLIC_ENDPOINTS } from "@rtnn/config";
import { getServerPreferencesFromRequest } from "@/lib/i18n/server";
import {
  clearSessionTokens,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/server/auth-cookies";
import { resolveBaseUrl } from "@/lib/server/api-client";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  await clearSessionTokens();

  if (refreshToken) {
    try {
      const { locale } = await getServerPreferencesFromRequest();
      await fetch(`${resolveBaseUrl()}${PUBLIC_ENDPOINTS.auth.customer.logout}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // 忽略网络错误
    }
  }

  redirect("/login");
}
