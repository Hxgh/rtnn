import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type {
  AdminLoginRequest,
  AuthUser,
  SessionTokens,
  UserSession,
} from "@rtnn/shared-types";
import { SESSION_COOKIE_KEYS } from "@rtnn/config";
import {
  getMe,
  loginAdmin,
  logoutAdmin,
  refreshAdminSession,
} from "@/src/lib/api-client";
import { adminRoutes } from "@/src/lib/admin-routes";
import { resolveErrorStatus } from "@/src/lib/errors";

const ACCESS_TOKEN_KEY = SESSION_COOKIE_KEYS.adminAccessToken;
const REFRESH_TOKEN_KEY = SESSION_COOKIE_KEYS.adminRefreshToken;

const secureCookie = process.env.NODE_ENV === "production";

function buildCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: secureCookie,
    path: "/",
    maxAge,
  };
}

export async function getAccessToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ACCESS_TOKEN_KEY)?.value ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(REFRESH_TOKEN_KEY)?.value ?? null;
}

export async function requireUserSession() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect(adminRoutes.login);
  }
  try {
    const me: AuthUser = await getMe(accessToken);
    return { me, accessToken };
  } catch (error) {
    const status = resolveErrorStatus(error);
    if (status === 403) {
      redirect(adminRoutes.forbidden);
    }
    if (status !== 401) {
      throw error;
    }

    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      await clearSession();
      redirect(adminRoutes.login);
    }
    try {
      const session = await refreshAdminSession(refreshToken);
      await persistSessionTokens(session.tokens);
      return { me: session.user, accessToken: session.tokens.accessToken };
    } catch {
      await clearSession();
      redirect(adminRoutes.login);
    }
  }
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(ACCESS_TOKEN_KEY);
  jar.delete(REFRESH_TOKEN_KEY);
}

export async function persistSessionTokens(tokens: SessionTokens) {
  const jar = await cookies();
  jar.set(
    ACCESS_TOKEN_KEY,
    tokens.accessToken,
    buildCookieOptions(tokens.expiresIn),
  );
  jar.set(
    REFRESH_TOKEN_KEY,
    tokens.refreshToken,
    buildCookieOptions(tokens.refreshExpiresIn),
  );
}

export async function createSession(
  credentials: AdminLoginRequest,
): Promise<UserSession> {
  const session = await loginAdmin(credentials);
  await persistSessionTokens(session.tokens);
  return session.user;
}

export async function logoutSession() {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try {
      await logoutAdmin(refreshToken);
    } catch {
      // best effort cleanup even if logout fails
    }
  }
  await clearSession();
}
