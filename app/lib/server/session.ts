import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { CustomerMeResponse } from "@rtnn/shared-types";
import { mapMeResponseToSession, type AppSession } from "@/lib/contracts";
import { createServerApiClient } from "@/lib/server/api-client";
import { REFRESH_TOKEN_COOKIE } from "@/lib/server/auth-cookies";

type ApiError = Error & {
  status?: number;
};

async function getMeSession(accessToken?: string): Promise<AppSession> {
  const client = await createServerApiClient(
    accessToken ? { accessToken } : undefined,
  );
  const me = (await client.auth.customer.me()) as CustomerMeResponse;
  return mapMeResponseToSession(me);
}

async function hasRefreshToken() {
  const cookieStore = await cookies();
  return Boolean(cookieStore.get(REFRESH_TOKEN_COOKIE)?.value);
}

function buildRefreshHref(redirectTo: string) {
  return `/api/session/refresh?redirectTo=${encodeURIComponent(redirectTo)}`;
}

export async function readSession(options?: {
  redirectTo?: string;
}): Promise<AppSession | null> {
  try {
    return await getMeSession();
  } catch (error) {
    const status = (error as ApiError).status;
    if (status === 401 && options?.redirectTo && (await hasRefreshToken())) {
      redirect(buildRefreshHref(options.redirectTo));
    }
    return null;
  }
}

export async function requireSession(redirectTo = "/me"): Promise<AppSession> {
  try {
    return await getMeSession();
  } catch (error) {
    const status = (error as ApiError).status;
    if (status === 403) {
      redirect("/403");
    }
    if (status === 401 && (await hasRefreshToken())) {
      redirect(buildRefreshHref(redirectTo));
    }
  }

  redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
}
