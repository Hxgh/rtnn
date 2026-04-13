import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { CustomerMeResponse } from "@rtnn/shared-types";
import { mapMeResponseToSession, type AppSession } from "@/lib/contracts";
import { createServerApiClient } from "@/lib/server/api-client";
import { REFRESH_TOKEN_COOKIE } from "@/lib/server/auth-cookies";

type ApiError = Error & {
  status?: number;
};

export async function readSession(): Promise<AppSession | null> {
  try {
    const client = await createServerApiClient();
    const me = (await client.auth.customer.me()) as CustomerMeResponse;
    return mapMeResponseToSession(me);
  } catch {
    return null;
  }
}

export async function requireSession(redirectTo = "/me"): Promise<AppSession> {
  try {
    const client = await createServerApiClient();
    const me = (await client.auth.customer.me()) as CustomerMeResponse;
    return mapMeResponseToSession(me);
  } catch (error) {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
    const status = (error as ApiError).status;
    if (status === 401 && refreshToken) {
      redirect(`/api/session/refresh?redirectTo=${encodeURIComponent(redirectTo)}`);
    }
  }

  redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
}
