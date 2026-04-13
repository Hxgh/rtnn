export const PORTS = {
  backend: 5100,
  admin: 5101,
  app: 5102,
  weappH5: 5103,
} as const;

export const APP_IDS = {
  backend: "backend",
  admin: "admin",
  app: "app",
  weapp: "weapp",
} as const;

export const API_PREFIX = "/api/v1";

export const PUBLIC_ENDPOINTS = {
  health: "/healthz",
  ready: "/readyz",
  openapi: "/openapi.json",
  auth: {
    admin: {
      login: `${API_PREFIX}/auth/admin/login`,
      refresh: `${API_PREFIX}/auth/admin/refresh`,
      logout: `${API_PREFIX}/auth/admin/logout`,
      me: `${API_PREFIX}/auth/admin/me`,
    },
    customer: {
      login: `${API_PREFIX}/auth/customer/login`,
      refresh: `${API_PREFIX}/auth/customer/refresh`,
      logout: `${API_PREFIX}/auth/customer/logout`,
      me: `${API_PREFIX}/auth/customer/me`,
    },
  },
} as const;

export const ENV_KEYS = {
  nodeEnv: "NODE_ENV",
  backendPort: "PORT",
  backendBaseUrl: "NEXT_PUBLIC_API_BASE_URL",
  backendPublicUrl: "NEXT_PUBLIC_BACKEND_URL",
  backendInternalBaseUrl: "BACKEND_INTERNAL_BASE_URL",
  jwtSecret: "JWT_SECRET",
  jwtRefreshSecret: "JWT_REFRESH_SECRET",
  databaseUrl: "DATABASE_URL",
  deployWebhookUrl: "DEPLOY_REPOSITORY_DISPATCH_URL",
  deployWebhookToken: "DEPLOY_REPOSITORY_DISPATCH_TOKEN",
  ghcrUsername: "GHCR_USERNAME",
  ghcrToken: "GHCR_TOKEN",
} as const;

export const SUPPORTED_LOCALES = ["zh-CN", "en-US"] as const;
export const DEFAULT_LOCALE = "zh-CN";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const THEME_MODES = ["light", "dark", "system"] as const;
export const DEFAULT_THEME_MODE = "system";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const UI_COOKIE_KEYS = {
  adminLocale: "rtnn_admin_locale",
  adminTheme: "rtnn_admin_theme",
  appLocale: "rtnn_app_locale",
  appTheme: "rtnn_app_theme",
} as const;

export const TEMPLATE_DEFAULTS = {
  admin: {
    email: "admin@rtnn.local",
    password: "Admin123!@#",
    displayName: "Template Admin",
  },
  customer: {
    email: "customer@rtnn.local",
    password: "Customer123!@#",
    displayName: "Template Customer",
  },
} as const;

export const DESIGN_TOKENS = {
  radii: {
    sm: "0.5rem",
    md: "0.875rem",
    lg: "1.25rem",
    xl: "1.75rem",
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
  },
  colors: {
    ink: "#0f172a",
    paper: "#f8fafc",
    brand: "#0f766e",
    brandSoft: "#ccfbf1",
    accent: "#b45309",
    accentSoft: "#fef3c7",
    danger: "#b91c1c",
    muted: "#475569",
    border: "#cbd5e1",
  },
  fonts: {
    display: '"Space Grotesk", "Noto Sans SC", sans-serif',
    body: '"Manrope", "Noto Sans SC", sans-serif',
    mono: '"JetBrains Mono", monospace',
  },
} as const;

export type PortMap = typeof PORTS;
export type PublicEndpointMap = typeof PUBLIC_ENDPOINTS;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type ThemeMode = (typeof THEME_MODES)[number];

const supportedLocaleSet = new Set<string>(SUPPORTED_LOCALES);
const themeModeSet = new Set<string>(THEME_MODES);

export function isSupportedLocale(value?: string | null): value is SupportedLocale {
  return Boolean(value && supportedLocaleSet.has(value));
}

export function normalizeSupportedLocale(value?: string | null): SupportedLocale {
  if (isSupportedLocale(value)) {
    return value;
  }
  return DEFAULT_LOCALE;
}

export function resolveLocaleFromAcceptLanguage(
  header?: string | null,
): SupportedLocale {
  if (!header) {
    return DEFAULT_LOCALE;
  }

  const lower = header.toLowerCase();
  if (lower.includes("zh")) {
    return "zh-CN";
  }
  if (lower.includes("en")) {
    return "en-US";
  }
  return DEFAULT_LOCALE;
}

export function isThemeMode(value?: string | null): value is ThemeMode {
  return Boolean(value && themeModeSet.has(value));
}

export function normalizeThemeMode(value?: string | null): ThemeMode {
  if (isThemeMode(value)) {
    return value;
  }
  return DEFAULT_THEME_MODE;
}
