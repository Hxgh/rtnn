import { cookies, headers } from "next/headers";
import {
  getMessagesByLocale,
  type AppMessages,
} from "@/lib/i18n";
import {
  APP_LOCALE_COOKIE,
  APP_THEME_COOKIE,
  normalizeAppLocale,
  normalizeAppTheme,
  resolveAppLocaleFromAcceptLanguage,
  type AppLocale,
  type AppTheme,
} from "@/lib/preferences";

export async function getServerPreferencesFromRequest(): Promise<{
  locale: AppLocale;
  theme: AppTheme;
}> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(APP_LOCALE_COOKIE)?.value;
  const cookieTheme = cookieStore.get(APP_THEME_COOKIE)?.value;

  if (cookieLocale) {
    return {
      locale: normalizeAppLocale(cookieLocale),
      theme: normalizeAppTheme(cookieTheme),
    };
  }

  const acceptLanguage = (await headers()).get("accept-language");
  return {
    locale: resolveAppLocaleFromAcceptLanguage(acceptLanguage),
    theme: normalizeAppTheme(cookieTheme),
  };
}

export async function getServerLocale(): Promise<AppLocale> {
  const { locale } = await getServerPreferencesFromRequest();
  return locale;
}

export async function getServerI18n(): Promise<{
  locale: AppLocale;
  messages: AppMessages;
}> {
  const { locale } = await getServerPreferencesFromRequest();
  return {
    locale,
    messages: getMessagesByLocale(locale),
  };
}
