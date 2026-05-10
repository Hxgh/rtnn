declare const process: {
  env: Record<string, string | undefined>;
};

const RUNTIME_ENV = {
  NEXT_PUBLIC_TEMPLATE_PROJECT_ID: process.env.NEXT_PUBLIC_TEMPLATE_PROJECT_ID,
  TARO_APP_TEMPLATE_PROJECT_ID: process.env.TARO_APP_TEMPLATE_PROJECT_ID,
  TEMPLATE_PROJECT_ID: process.env.TEMPLATE_PROJECT_ID,
  NEXT_PUBLIC_TEMPLATE_BRAND_NAME: process.env.NEXT_PUBLIC_TEMPLATE_BRAND_NAME,
  TARO_APP_TEMPLATE_BRAND_NAME: process.env.TARO_APP_TEMPLATE_BRAND_NAME,
  TEMPLATE_BRAND_NAME: process.env.TEMPLATE_BRAND_NAME,
  NEXT_PUBLIC_RTNN_ADMIN_DESKTOP_NAME: process.env.NEXT_PUBLIC_RTNN_ADMIN_DESKTOP_NAME,
  RTNN_ADMIN_DESKTOP_NAME: process.env.RTNN_ADMIN_DESKTOP_NAME,
  NEXT_PUBLIC_RTNN_APP_MOBILE_NAME: process.env.NEXT_PUBLIC_RTNN_APP_MOBILE_NAME,
  RTNN_APP_MOBILE_NAME: process.env.RTNN_APP_MOBILE_NAME,
  NEXT_PUBLIC_RTNN_APP_ICON_TEXT: process.env.NEXT_PUBLIC_RTNN_APP_ICON_TEXT,
  RTNN_APP_ICON_TEXT: process.env.RTNN_APP_ICON_TEXT,
  NEXT_PUBLIC_TEMPLATE_COOKIE_PREFIX: process.env.NEXT_PUBLIC_TEMPLATE_COOKIE_PREFIX,
  TARO_APP_TEMPLATE_COOKIE_PREFIX: process.env.TARO_APP_TEMPLATE_COOKIE_PREFIX,
  TEMPLATE_COOKIE_PREFIX: process.env.TEMPLATE_COOKIE_PREFIX,
  TEMPLATE_IMAGE_NAME_PREFIX: process.env.TEMPLATE_IMAGE_NAME_PREFIX,
  TEMPLATE_DEPLOY_APPLICATION: process.env.TEMPLATE_DEPLOY_APPLICATION,
  TEMPLATE_DEPLOY_EVENT_TYPE: process.env.TEMPLATE_DEPLOY_EVENT_TYPE,
  TEMPLATE_ADMIN_EMAIL: process.env.TEMPLATE_ADMIN_EMAIL,
  TARO_APP_TEMPLATE_ADMIN_EMAIL: process.env.TARO_APP_TEMPLATE_ADMIN_EMAIL,
  NEXT_PUBLIC_TEMPLATE_ADMIN_EMAIL: process.env.NEXT_PUBLIC_TEMPLATE_ADMIN_EMAIL,
  TEMPLATE_ADMIN_DISPLAY_NAME: process.env.TEMPLATE_ADMIN_DISPLAY_NAME,
  NEXT_PUBLIC_TEMPLATE_ADMIN_DISPLAY_NAME: process.env.NEXT_PUBLIC_TEMPLATE_ADMIN_DISPLAY_NAME,
  TEMPLATE_CUSTOMER_EMAIL: process.env.TEMPLATE_CUSTOMER_EMAIL,
  TARO_APP_TEMPLATE_CUSTOMER_EMAIL: process.env.TARO_APP_TEMPLATE_CUSTOMER_EMAIL,
  NEXT_PUBLIC_TEMPLATE_CUSTOMER_EMAIL: process.env.NEXT_PUBLIC_TEMPLATE_CUSTOMER_EMAIL,
  TEMPLATE_CUSTOMER_DISPLAY_NAME: process.env.TEMPLATE_CUSTOMER_DISPLAY_NAME,
  NEXT_PUBLIC_TEMPLATE_CUSTOMER_DISPLAY_NAME:
    process.env.NEXT_PUBLIC_TEMPLATE_CUSTOMER_DISPLAY_NAME,
  TEMPLATE_BACKEND_PORT: process.env.TEMPLATE_BACKEND_PORT,
  TEMPLATE_ADMIN_PORT: process.env.TEMPLATE_ADMIN_PORT,
  TEMPLATE_APP_PORT: process.env.TEMPLATE_APP_PORT,
  TEMPLATE_WEAPP_H5_PORT: process.env.TEMPLATE_WEAPP_H5_PORT,
  TEMPLATE_JWT_ISSUER: process.env.TEMPLATE_JWT_ISSUER,
  TEMPLATE_JWT_AUDIENCE: process.env.TEMPLATE_JWT_AUDIENCE,
} as const;

function readEnv(keys: Array<keyof typeof RUNTIME_ENV>, fallback: string): string {
  for (const key of keys) {
    const value = RUNTIME_ENV[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return fallback;
}

const templateProjectId = readEnv(
  ["NEXT_PUBLIC_TEMPLATE_PROJECT_ID", "TARO_APP_TEMPLATE_PROJECT_ID", "TEMPLATE_PROJECT_ID"],
  "rtnn",
);
const templateBrandName = readEnv(
  ["NEXT_PUBLIC_TEMPLATE_BRAND_NAME", "TARO_APP_TEMPLATE_BRAND_NAME", "TEMPLATE_BRAND_NAME"],
  "RTNN",
);
const adminDesktopName = readEnv(
  ["NEXT_PUBLIC_RTNN_ADMIN_DESKTOP_NAME", "RTNN_ADMIN_DESKTOP_NAME"],
  `${templateBrandName} Admin`,
);
const appMobileName = readEnv(
  ["NEXT_PUBLIC_RTNN_APP_MOBILE_NAME", "RTNN_APP_MOBILE_NAME"],
  `${templateBrandName} App`,
);
const appIconText = readEnv(
  ["NEXT_PUBLIC_RTNN_APP_ICON_TEXT", "RTNN_APP_ICON_TEXT"],
  templateBrandName,
);
const templateCookiePrefix = readEnv(
  ["NEXT_PUBLIC_TEMPLATE_COOKIE_PREFIX", "TARO_APP_TEMPLATE_COOKIE_PREFIX", "TEMPLATE_COOKIE_PREFIX"],
  templateProjectId,
);
const templateImageNamePrefix = readEnv(
  ["TEMPLATE_IMAGE_NAME_PREFIX"],
  templateProjectId,
);
const templateDeployApplication = readEnv(
  ["TEMPLATE_DEPLOY_APPLICATION"],
  templateProjectId,
);
const templateDeployEventType = readEnv(
  ["TEMPLATE_DEPLOY_EVENT_TYPE"],
  `promote-${templateProjectId}`,
);
const templateAdminEmail = readEnv(
  ["TEMPLATE_ADMIN_EMAIL", "TARO_APP_TEMPLATE_ADMIN_EMAIL", "NEXT_PUBLIC_TEMPLATE_ADMIN_EMAIL"],
  `admin@${templateProjectId}.local`,
);
const templateAdminDisplayName = readEnv(
  ["TEMPLATE_ADMIN_DISPLAY_NAME", "NEXT_PUBLIC_TEMPLATE_ADMIN_DISPLAY_NAME"],
  "Template Admin",
);
const templateCustomerEmail = readEnv(
  [
    "TEMPLATE_CUSTOMER_EMAIL",
    "TARO_APP_TEMPLATE_CUSTOMER_EMAIL",
    "NEXT_PUBLIC_TEMPLATE_CUSTOMER_EMAIL",
  ],
  `customer@${templateProjectId}.local`,
);
const templateCustomerDisplayName = readEnv(
  ["TEMPLATE_CUSTOMER_DISPLAY_NAME", "NEXT_PUBLIC_TEMPLATE_CUSTOMER_DISPLAY_NAME"],
  "Template Customer",
);

export const PORTS = {
  backend: Number(readEnv(["TEMPLATE_BACKEND_PORT"], "5100")),
  admin: Number(readEnv(["TEMPLATE_ADMIN_PORT"], "5101")),
  app: Number(readEnv(["TEMPLATE_APP_PORT"], "5102")),
  weappH5: Number(readEnv(["TEMPLATE_WEAPP_H5_PORT"], "5103")),
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
  version: "/version",
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
  templateProjectId: "TEMPLATE_PROJECT_ID",
  templateBrandName: "TEMPLATE_BRAND_NAME",
  templateCookiePrefix: "TEMPLATE_COOKIE_PREFIX",
  templateImageNamePrefix: "TEMPLATE_IMAGE_NAME_PREFIX",
  templateDeployApplication: "TEMPLATE_DEPLOY_APPLICATION",
  templateDeployEventType: "TEMPLATE_DEPLOY_EVENT_TYPE",
  jwtSecret: "JWT_SECRET",
  jwtRefreshSecret: "JWT_REFRESH_SECRET",
  databaseUrl: "DATABASE_URL",
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

export const TEMPLATE_IDENTITY = {
  projectId: templateProjectId,
  brandName: templateBrandName,
  cookiePrefix: templateCookiePrefix,
  imageNamePrefix: templateImageNamePrefix,
  deployApplication: templateDeployApplication,
  deployEventType: templateDeployEventType,
} as const;

export const TEMPLATE_DISPLAY = {
  brand: templateBrandName,
  adminAppZh: `${templateBrandName} 管理后台`,
  adminAppEn: `${templateBrandName} Admin`,
  appZh: `${templateBrandName} 客户端`,
  appEn: `${templateBrandName} App`,
  adminDesktopName,
  appMobileName,
  appIconText,
} as const;

export const UI_COOKIE_KEYS = {
  adminLocale: `${templateCookiePrefix}_admin_locale`,
  adminTheme: `${templateCookiePrefix}_admin_theme`,
  appLocale: `${templateCookiePrefix}_app_locale`,
  appTheme: `${templateCookiePrefix}_app_theme`,
  weappLocale: `${templateCookiePrefix}_weapp_locale`,
  weappTheme: `${templateCookiePrefix}_weapp_theme`,
} as const;

export const SESSION_COOKIE_KEYS = {
  adminAccessToken: `${templateCookiePrefix}_admin_access_token`,
  adminRefreshToken: `${templateCookiePrefix}_admin_refresh_token`,
  customerAccessToken: `${templateCookiePrefix}_access_token`,
  customerRefreshToken: `${templateCookiePrefix}_refresh_token`,
} as const;

export const WEAPP_STORAGE_KEYS = {
  accessToken: `${templateCookiePrefix}:session:access-token`,
  refreshToken: `${templateCookiePrefix}:session:refresh-token`,
  userId: `${templateCookiePrefix}:session:user-id`,
  email: `${templateCookiePrefix}:session:email`,
  name: `${templateCookiePrefix}:session:name`,
  role: `${templateCookiePrefix}:session:role`,
} as const;

export const JWT_DEFAULTS = {
  issuer: readEnv(["TEMPLATE_JWT_ISSUER"], `${templateProjectId}-backend`),
  audience: readEnv(["TEMPLATE_JWT_AUDIENCE"], `${templateProjectId}-clients`),
} as const;

export const TEMPLATE_ACCOUNT_DEFAULTS = {
  admin: {
    email: templateAdminEmail,
    displayName: templateAdminDisplayName,
  },
  customer: {
    email: templateCustomerEmail,
    displayName: templateCustomerDisplayName,
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
