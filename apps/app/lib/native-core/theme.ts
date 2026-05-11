"use client";

import type { AppTheme } from "@/lib/preferences";

type NativeResolvedTheme = "light" | "dark";
type NativeThemeBridge = {
  setTheme?: (theme: NativeResolvedTheme, mode: AppTheme) => void;
  getSystemTheme?: () => string;
};
type NativeThemeWindow = Window & {
  AndroidTheme?: NativeThemeBridge;
  __RTNN_SYSTEM_THEME__?: string;
  __ANDROID_SYSTEM_THEME__?: string;
};

const NATIVE_THEME_CHANGE_EVENT = "rtnn:native-theme-change";
const THEME_COLOR = {
  light: "#ffffff",
  dark: "#171717",
} satisfies Record<NativeResolvedTheme, string>;

function getDefaultWindow(): NativeThemeWindow | null {
  return typeof window === "undefined" ? null : (window as NativeThemeWindow);
}

function normalizeResolvedTheme(value?: string | null): NativeResolvedTheme | null {
  if (value === "light" || value === "dark") {
    return value;
  }

  return null;
}

function readNativeSystemTheme(win: NativeThemeWindow) {
  const fromGlobal =
    normalizeResolvedTheme(win.__RTNN_SYSTEM_THEME__) ??
    normalizeResolvedTheme(win.__ANDROID_SYSTEM_THEME__);

  if (fromGlobal) {
    return fromGlobal;
  }

  try {
    return normalizeResolvedTheme(win.AndroidTheme?.getSystemTheme?.());
  } catch {
    return null;
  }
}

function syncThemeColor(doc: Document, resolvedTheme: NativeResolvedTheme) {
  let meta = doc.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

  if (!meta) {
    meta = doc.createElement("meta");
    meta.name = "theme-color";
    doc.head.append(meta);
  }

  meta.content = THEME_COLOR[resolvedTheme];
}

export function resolveAppResolvedTheme(
  mode: AppTheme,
  win: NativeThemeWindow | null = getDefaultWindow(),
): NativeResolvedTheme {
  if (mode === "light" || mode === "dark") {
    return mode;
  }

  if (!win) {
    return "light";
  }

  return (
    readNativeSystemTheme(win) ??
    (win.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );
}

export function syncAppNativeTheme(
  mode: AppTheme,
  options: {
    root?: HTMLElement | null;
    window?: NativeThemeWindow | null;
  } = {},
) {
  const win = options.window ?? getDefaultWindow();
  const root = options.root ?? win?.document?.documentElement ?? null;
  const resolvedTheme = resolveAppResolvedTheme(mode, win);

  if (root) {
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;
    root.setAttribute("data-theme", resolvedTheme);
  }

  if (win?.document) {
    syncThemeColor(win.document, resolvedTheme);
  }

  try {
    const androidTheme = win?.AndroidTheme;
    if (typeof androidTheme?.setTheme === "function") {
      androidTheme.setTheme(resolvedTheme, mode);
    }
  } catch {
    // Native theme sync is best-effort; Web theme should remain authoritative.
  }

  return resolvedTheme;
}

export function installAppNativeThemeListener(
  callback: () => void,
  win: NativeThemeWindow | null = getDefaultWindow(),
) {
  if (!win) {
    return () => {};
  }

  const listener = () => callback();
  win.addEventListener(NATIVE_THEME_CHANGE_EVENT, listener);

  return () => {
    win.removeEventListener(NATIVE_THEME_CHANGE_EVENT, listener);
  };
}
