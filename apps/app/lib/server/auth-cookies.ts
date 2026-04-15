import { cookies } from "next/headers";
import type { SessionTokens } from "@rtnn/shared-types";
import { SESSION_COOKIE_KEYS } from "@rtnn/config";

export const ACCESS_TOKEN_COOKIE = SESSION_COOKIE_KEYS.customerAccessToken;
export const REFRESH_TOKEN_COOKIE = SESSION_COOKIE_KEYS.customerRefreshToken;

const defaultCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function persistSessionTokens(tokens: SessionTokens) {
  const jar = await cookies();
  jar.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...defaultCookieOptions,
    maxAge: tokens.expiresIn,
  });
  jar.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...defaultCookieOptions,
    maxAge: tokens.refreshExpiresIn,
  });
}

export async function clearSessionTokens() {
  const jar = await cookies();
  jar.delete(ACCESS_TOKEN_COOKIE);
  jar.delete(REFRESH_TOKEN_COOKIE);
}
