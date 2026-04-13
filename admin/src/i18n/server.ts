import { cookies, headers } from "next/headers";
import {
  ADMIN_LOCALE_COOKIE,
  ADMIN_THEME_COOKIE,
  normalizeAdminLocale,
  normalizeAdminTheme,
  resolveAdminLocaleFromAcceptLanguage,
  type AdminLocale,
  type AdminTheme,
} from "@/src/lib/preferences";
import { getAdminDictionary, type AdminDictionary } from "@/src/i18n/dictionaries";

export async function getAdminPreferencesFromRequest(): Promise<{
  locale: AdminLocale;
  theme: AdminTheme;
}> {
  const jar = await cookies();
  const cookieLocale = jar.get(ADMIN_LOCALE_COOKIE)?.value;
  const cookieTheme = jar.get(ADMIN_THEME_COOKIE)?.value;

  if (cookieLocale) {
    return {
      locale: normalizeAdminLocale(cookieLocale),
      theme: normalizeAdminTheme(cookieTheme),
    };
  }

  const acceptLanguage = (await headers()).get("accept-language");
  return {
    locale: resolveAdminLocaleFromAcceptLanguage(acceptLanguage),
    theme: normalizeAdminTheme(cookieTheme),
  };
}

export async function getAdminI18n(): Promise<{
  locale: AdminLocale;
  dictionary: AdminDictionary;
}> {
  const { locale } = await getAdminPreferencesFromRequest();
  return {
    locale,
    dictionary: getAdminDictionary(locale),
  };
}
