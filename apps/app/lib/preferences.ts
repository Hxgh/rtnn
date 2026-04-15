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

export const APP_LOCALE_COOKIE = UI_COOKIE_KEYS.appLocale;
export const APP_THEME_COOKIE = UI_COOKIE_KEYS.appTheme;
export const APP_PREFERENCE_COOKIE_MAX_AGE = LOCALE_COOKIE_MAX_AGE;
export const APP_THEME_COOKIE_MAX_AGE = THEME_COOKIE_MAX_AGE;

export const APP_LOCALES = SUPPORTED_LOCALES;
export const APP_THEMES = THEME_MODES;
export const DEFAULT_APP_LOCALE = DEFAULT_LOCALE;
export const DEFAULT_APP_THEME = DEFAULT_THEME_MODE;

export type AppLocale = SupportedLocale;
export type AppTheme = ThemeMode;

export function normalizeAppLocale(value?: string | null): AppLocale {
  return normalizeSupportedLocale(value);
}

export function normalizeAppTheme(value?: string | null): AppTheme {
  return normalizeThemeMode(value);
}

export function resolveAppLocaleFromAcceptLanguage(
  header?: string | null,
): AppLocale {
  return resolveLocaleFromAcceptLanguage(header);
}
