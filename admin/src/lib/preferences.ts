import {
  DEFAULT_LOCALE,
  DEFAULT_THEME_MODE,
  LOCALE_COOKIE_MAX_AGE,
  SUPPORTED_LOCALES,
  THEME_COOKIE_MAX_AGE,
  THEME_MODES,
  UI_COOKIE_KEYS,
  normalizeSupportedLocale,
  normalizeThemeMode,
  resolveLocaleFromAcceptLanguage,
  type SupportedLocale,
  type ThemeMode,
} from "@rtnn/config";

export const ADMIN_LOCALE_COOKIE = UI_COOKIE_KEYS.adminLocale;
export const ADMIN_THEME_COOKIE = UI_COOKIE_KEYS.adminTheme;
export const ADMIN_PREFERENCE_COOKIE_MAX_AGE = LOCALE_COOKIE_MAX_AGE;
export const ADMIN_THEME_COOKIE_MAX_AGE = THEME_COOKIE_MAX_AGE;

export const SUPPORTED_ADMIN_LOCALES = SUPPORTED_LOCALES;
export const SUPPORTED_ADMIN_THEMES = THEME_MODES;
export const DEFAULT_ADMIN_LOCALE = DEFAULT_LOCALE;
export const DEFAULT_ADMIN_THEME = DEFAULT_THEME_MODE;

export type AdminLocale = SupportedLocale;
export type AdminTheme = ThemeMode;

export function normalizeAdminLocale(value?: string | null): AdminLocale {
  return normalizeSupportedLocale(value);
}

export function normalizeAdminTheme(value?: string | null): AdminTheme {
  return normalizeThemeMode(value);
}

export function resolveAdminLocaleFromAcceptLanguage(
  header?: string | null,
): AdminLocale {
  return resolveLocaleFromAcceptLanguage(header);
}
