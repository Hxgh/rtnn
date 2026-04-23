"use client";

import {
  createContext,
  startTransition,
  use,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  ADMIN_PREFERENCE_COOKIE_MAX_AGE,
  ADMIN_LOCALE_COOKIE,
  ADMIN_THEME_COOKIE,
  ADMIN_THEME_COOKIE_MAX_AGE,
  normalizeAdminLocale,
  normalizeAdminTheme,
  type AdminLocale,
  type AdminTheme,
} from "@/src/lib/preferences";
import {
  getAdminDictionary,
  type AdminDictionary,
} from "@/src/i18n/dictionaries";

type PreferencesContextValue = {
  locale: AdminLocale;
  theme: AdminTheme;
  dictionary: AdminDictionary;
  setLocale: (locale: AdminLocale) => void;
  setTheme: (theme: AdminTheme) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function resolveTheme(theme: AdminTheme) {
  if (theme === "dark" || theme === "light") {
    return theme;
  }
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function writeCookie(name: string, value: string) {
  const maxAge =
    name === ADMIN_THEME_COOKIE
      ? ADMIN_THEME_COOKIE_MAX_AGE
      : ADMIN_PREFERENCE_COOKIE_MAX_AGE;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function PreferencesProvider({
  children,
  defaultLocale,
  defaultTheme,
}: {
  children: ReactNode;
  defaultLocale: AdminLocale;
  defaultTheme: AdminTheme;
}) {
  const [locale, setLocaleState] = useState<AdminLocale>(normalizeAdminLocale(defaultLocale));
  const [theme, setThemeState] = useState<AdminTheme>(normalizeAdminTheme(defaultTheme));
  const router = useRouter();

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = () => {
      const resolved = resolveTheme(theme);
      root.classList.toggle("dark", resolved === "dark");
      root.style.colorScheme = resolved;
    };

    applyTheme();
    writeCookie(ADMIN_THEME_COOKIE, theme);

    if (theme !== "system") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme();
    media.addEventListener("change", listener);
    return () => {
      media.removeEventListener("change", listener);
    };
  }, [theme]);

  function setLocale(nextLocale: AdminLocale) {
    if (nextLocale === locale) {
      return;
    }
    setLocaleState(nextLocale);
    startTransition(() => {
      void (async () => {
        const formData = new FormData();
        formData.set("locale", nextLocale);
        await fetch("/api/preferences/locale", {
          method: "POST",
          body: formData,
          cache: "no-store",
        });
        writeCookie(ADMIN_LOCALE_COOKIE, nextLocale);
        router.refresh();
      })();
    });
  }

  function setTheme(nextTheme: AdminTheme) {
    setThemeState(nextTheme);
  }

  const dictionary = getAdminDictionary(locale);

  return (
    <PreferencesContext value={{ locale, theme, dictionary, setLocale, setTheme }}>
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
