"use client";

import {
  createContext,
  startTransition,
  useEffect,
  use,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  getMessagesByLocale,
  type AppMessages,
} from "@/lib/i18n";
import {
  APP_LOCALE_COOKIE,
  APP_PREFERENCE_COOKIE_MAX_AGE,
  APP_THEME_COOKIE,
  APP_THEME_COOKIE_MAX_AGE,
  normalizeAppLocale,
  normalizeAppTheme,
  type AppLocale,
  type AppTheme,
} from "@/lib/preferences";

type PreferencesContextValue = {
  locale: AppLocale;
  messages: AppMessages;
  setLocale: (nextLocale: AppLocale) => void;
  theme: AppTheme;
  setTheme: (nextTheme: AppTheme) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function applyThemeClass(theme: AppTheme) {
  const root = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

function writeCookie(name: string, value: string) {
  const maxAge =
    name === APP_THEME_COOKIE
      ? APP_THEME_COOKIE_MAX_AGE
      : APP_PREFERENCE_COOKIE_MAX_AGE;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function PreferencesProvider({
  children,
  initialLocale,
  initialTheme,
}: {
  children: React.ReactNode;
  initialLocale: AppLocale;
  initialTheme: AppTheme;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<AppLocale>(normalizeAppLocale(initialLocale));
  const [theme, setThemeState] = useState<AppTheme>(normalizeAppTheme(initialTheme));

  useEffect(() => {
    applyThemeClass(theme);
    writeCookie(APP_THEME_COOKIE, theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      applyThemeClass(theme);
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [theme]);

  const messages = getMessagesByLocale(locale);

  function setLocale(nextLocale: AppLocale) {
    const normalized = normalizeAppLocale(nextLocale);
    if (normalized === locale) {
      return;
    }
    setLocaleState(normalized);
    writeCookie(APP_LOCALE_COOKIE, normalized);
    startTransition(() => {
      router.refresh();
    });
  }

  function setTheme(nextTheme: AppTheme) {
    setThemeState(normalizeAppTheme(nextTheme));
  }

  return (
    <PreferencesContext value={{ locale, messages, setLocale, theme, setTheme }}>
      {children}
    </PreferencesContext>
  );
}

export function usePreferences() {
  const context = use(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return context;
}
