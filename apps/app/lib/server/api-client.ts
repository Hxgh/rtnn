import { createApiClient, createFetchTransport } from "@rtnn/api-sdk";
import { ENV_KEYS, PORTS } from "@rtnn/config";
import { cookies, headers } from "next/headers";
import {
  type AppLocale,
  APP_LOCALE_COOKIE,
  normalizeAppLocale,
  resolveAppLocaleFromAcceptLanguage,
} from "@/lib/preferences";
import { ACCESS_TOKEN_COOKIE } from "@/lib/server/auth-cookies";

export const resolveBaseUrl = () =>
  process.env[ENV_KEYS.backendInternalBaseUrl] ??
  process.env[ENV_KEYS.backendBaseUrl] ??
  `http://localhost:${PORTS.backend}`;

export async function getRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(APP_LOCALE_COOKIE)?.value;
  const headerStore = await headers();
  return cookieLocale
    ? normalizeAppLocale(cookieLocale)
    : resolveAppLocaleFromAcceptLanguage(headerStore.get("accept-language"));
}

export async function createServerApiClient(options?: { accessToken?: string }) {
  const cookieStore = await cookies();
  const accessToken = options?.accessToken ?? cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const locale = await getRequestLocale();

  return createApiClient(
    createFetchTransport({
      baseUrl: resolveBaseUrl(),
      getHeaders: () => {
        const headers: Record<string, string> = {};
        headers["accept-language"] = locale;
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }
        return headers;
      },
    }),
  );
}

export async function getLatestClientDownload(query: {
  client: string;
  target: string;
  channel?: string;
  currentVersion?: string;
}) {
  const locale = await getRequestLocale();
  const client = createApiClient(
    createFetchTransport({
      baseUrl: resolveBaseUrl(),
      getHeaders: () => ({
        "accept-language": locale,
      }),
    }),
  );

  return client.clientDownloads.latest(query);
}
