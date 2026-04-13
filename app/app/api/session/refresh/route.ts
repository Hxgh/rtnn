import { NextResponse } from "next/server";
import { createApiClient, createFetchTransport } from "@rtnn/api-sdk";
import { getServerPreferencesFromRequest } from "@/lib/i18n/server";
import {
  clearSessionTokens,
  persistSessionTokens,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/server/auth-cookies";
import { resolveBaseUrl } from "@/lib/server/api-client";
import { cookies } from "next/headers";

function normalizeRedirectTo(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/me";
  }
  return value;
}

async function refreshSessionTokens() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    return false;
  }

  try {
    const { locale } = await getServerPreferencesFromRequest();
    const client = createApiClient(
      createFetchTransport({
        baseUrl: resolveBaseUrl(),
        getHeaders: () => ({
          "accept-language": locale,
        }),
      }),
    );
    const session = await client.auth.customer.refresh({ refreshToken });
    await persistSessionTokens(session.tokens);
    return true;
  } catch {
    await clearSessionTokens();
    return false;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectTo = normalizeRedirectTo(url.searchParams.get("redirectTo"));
  const ok = await refreshSessionTokens();
  if (!ok) {
    return NextResponse.redirect(
      new URL(
        `/login?error=expired&redirectTo=${encodeURIComponent(redirectTo)}`,
        request.url,
      ),
    );
  }

  return NextResponse.redirect(new URL(redirectTo, request.url));
}

export async function POST() {
  const ok = await refreshSessionTokens();
  if (!ok) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
