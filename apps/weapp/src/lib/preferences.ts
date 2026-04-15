import Taro from "@tarojs/taro"
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  UI_COOKIE_KEYS,
  normalizeSupportedLocale,
  resolveLocaleFromAcceptLanguage,
  type SupportedLocale
} from "@rtnn/config"

export const WEAPP_LOCALE_STORAGE_KEY = UI_COOKIE_KEYS.weappLocale
export const WEAPP_SUPPORTED_LOCALES = SUPPORTED_LOCALES
export const DEFAULT_WEAPP_LOCALE = DEFAULT_LOCALE

export type WeappLocale = SupportedLocale

function readStoredLocale() {
  try {
    return Taro.getStorageSync<string>(WEAPP_LOCALE_STORAGE_KEY) || undefined
  } catch {
    return undefined
  }
}

function readSystemLocale() {
  try {
    const language = Taro.getSystemInfoSync().language
    return language ? language.replace("_", "-") : undefined
  } catch {
    return undefined
  }
}

export function readWeappLocale(): WeappLocale {
  const storedLocale = readStoredLocale()
  if (storedLocale) {
    return normalizeSupportedLocale(storedLocale)
  }

  return resolveLocaleFromAcceptLanguage(readSystemLocale())
}

export function writeWeappLocale(locale: string) {
  try {
    Taro.setStorageSync(WEAPP_LOCALE_STORAGE_KEY, normalizeSupportedLocale(locale))
  } catch {
    // best effort persistence
  }
}
