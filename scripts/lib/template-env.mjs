import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const TEMPLATE_ENV_FILE = ".env";
export const TEMPLATE_ENV_EXAMPLE_FILE = ".env.example";

export const TEMPLATE_ENV_KEYS = [
  "TEMPLATE_PROJECT_ID",
  "TEMPLATE_BRAND_NAME",
  "TEMPLATE_COOKIE_PREFIX",
  "TEMPLATE_DATABASE_HOST",
  "TEMPLATE_DATABASE_PORT",
  "TEMPLATE_DATABASE_NAME",
  "TEMPLATE_DATABASE_USER",
  "TEMPLATE_DATABASE_PASSWORD",
  "TEMPLATE_BACKEND_PORT",
  "TEMPLATE_ADMIN_PORT",
  "TEMPLATE_APP_PORT",
  "TEMPLATE_WEAPP_H5_PORT",
  "TEMPLATE_IMAGE_NAME_PREFIX",
  "TEMPLATE_DEPLOY_APPLICATION",
  "TEMPLATE_DEPLOY_EVENT_TYPE",
  "TEMPLATE_ADMIN_EMAIL",
  "TEMPLATE_ADMIN_PASSWORD",
  "TEMPLATE_ADMIN_DISPLAY_NAME",
  "TEMPLATE_CUSTOMER_EMAIL",
  "TEMPLATE_CUSTOMER_PASSWORD",
  "TEMPLATE_CUSTOMER_DISPLAY_NAME",
  "TEMPLATE_JWT_ISSUER",
  "TEMPLATE_JWT_AUDIENCE",
  "TEMPLATE_JWT_ACCESS_SECRET",
  "TEMPLATE_JWT_REFRESH_SECRET",
  "TEMPLATE_JWT_ACCESS_EXPIRES_IN",
  "TEMPLATE_JWT_REFRESH_EXPIRES_IN",
];

const DERIVED_KEYS = [
  "TEMPLATE_COOKIE_PREFIX",
  "TEMPLATE_DATABASE_NAME",
  "TEMPLATE_IMAGE_NAME_PREFIX",
  "TEMPLATE_DEPLOY_APPLICATION",
  "TEMPLATE_DEPLOY_EVENT_TYPE",
  "TEMPLATE_ADMIN_EMAIL",
  "TEMPLATE_CUSTOMER_EMAIL",
  "TEMPLATE_JWT_ISSUER",
  "TEMPLATE_JWT_AUDIENCE",
];

const DEFAULT_TEMPLATE_ENV = {
  TEMPLATE_PROJECT_ID: "rtnn",
  TEMPLATE_BRAND_NAME: "RTNN",
  TEMPLATE_COOKIE_PREFIX: "rtnn",
  TEMPLATE_DATABASE_HOST: "localhost",
  TEMPLATE_DATABASE_PORT: "5432",
  TEMPLATE_DATABASE_NAME: "rtnn",
  TEMPLATE_DATABASE_USER: "postgres",
  TEMPLATE_DATABASE_PASSWORD: "postgres",
  TEMPLATE_BACKEND_PORT: "5100",
  TEMPLATE_ADMIN_PORT: "5101",
  TEMPLATE_APP_PORT: "5102",
  TEMPLATE_WEAPP_H5_PORT: "5103",
  TEMPLATE_IMAGE_NAME_PREFIX: "rtnn",
  TEMPLATE_DEPLOY_APPLICATION: "rtnn",
  TEMPLATE_DEPLOY_EVENT_TYPE: "promote-rtnn",
  TEMPLATE_ADMIN_EMAIL: "admin@rtnn.local",
  TEMPLATE_ADMIN_PASSWORD: "Admin123!@#",
  TEMPLATE_ADMIN_DISPLAY_NAME: "Template Admin",
  TEMPLATE_CUSTOMER_EMAIL: "customer@rtnn.local",
  TEMPLATE_CUSTOMER_PASSWORD: "Customer123!@#",
  TEMPLATE_CUSTOMER_DISPLAY_NAME: "Template Customer",
  TEMPLATE_JWT_ISSUER: "rtnn-backend",
  TEMPLATE_JWT_AUDIENCE: "rtnn-clients",
  TEMPLATE_JWT_ACCESS_SECRET: "replace-this-with-a-long-random-string-access",
  TEMPLATE_JWT_REFRESH_SECRET: "replace-this-with-a-long-random-string-refresh",
  TEMPLATE_JWT_ACCESS_EXPIRES_IN: "15m",
  TEMPLATE_JWT_REFRESH_EXPIRES_IN: "7d",
};

const TEMPLATE_PLACEHOLDER_PATTERN = /\{\{([A-Z0-9_]+)\}\}/g;

function normalizeRecord(input) {
  const output = {};

  for (const [key, value] of Object.entries(input)) {
    if (value == null) {
      continue;
    }

    const normalized = String(value).trim();
    if (!normalized) {
      continue;
    }

    output[key] = normalized;
  }

  return output;
}

function deriveTemplateEnv(values) {
  const normalized = normalizeRecord(values);
  const projectId =
    normalized.TEMPLATE_PROJECT_ID ?? DEFAULT_TEMPLATE_ENV.TEMPLATE_PROJECT_ID;
  const brandName =
    normalized.TEMPLATE_BRAND_NAME ?? DEFAULT_TEMPLATE_ENV.TEMPLATE_BRAND_NAME;

  return {
    ...DEFAULT_TEMPLATE_ENV,
    ...normalized,
    TEMPLATE_PROJECT_ID: projectId,
    TEMPLATE_BRAND_NAME: brandName,
    TEMPLATE_COOKIE_PREFIX:
      normalized.TEMPLATE_COOKIE_PREFIX ?? projectId,
    TEMPLATE_DATABASE_NAME:
      normalized.TEMPLATE_DATABASE_NAME ?? projectId,
    TEMPLATE_IMAGE_NAME_PREFIX:
      normalized.TEMPLATE_IMAGE_NAME_PREFIX ?? projectId,
    TEMPLATE_DEPLOY_APPLICATION:
      normalized.TEMPLATE_DEPLOY_APPLICATION ?? projectId,
    TEMPLATE_DEPLOY_EVENT_TYPE:
      normalized.TEMPLATE_DEPLOY_EVENT_TYPE ?? `promote-${projectId}`,
    TEMPLATE_ADMIN_EMAIL:
      normalized.TEMPLATE_ADMIN_EMAIL ?? `admin@${projectId}.local`,
    TEMPLATE_CUSTOMER_EMAIL:
      normalized.TEMPLATE_CUSTOMER_EMAIL ?? `customer@${projectId}.local`,
    TEMPLATE_JWT_ISSUER:
      normalized.TEMPLATE_JWT_ISSUER ?? `${projectId}-backend`,
    TEMPLATE_JWT_AUDIENCE:
      normalized.TEMPLATE_JWT_AUDIENCE ?? `${projectId}-clients`,
  };
}

export function parseEnvContent(content) {
  const payload = {};

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    payload[key] = value;
  }

  return payload;
}

export function readEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  return parseEnvContent(readFileSync(filePath, "utf8"));
}

function pickProcessTemplateEnv() {
  const output = {};

  for (const key of TEMPLATE_ENV_KEYS) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) {
      output[key] = value.trim();
    }
  }

  return output;
}

function applyProjectIdCascade(base, overrides) {
  if (!overrides.TEMPLATE_PROJECT_ID) {
    return deriveTemplateEnv({ ...base, ...overrides });
  }

  const previous = deriveTemplateEnv(base);
  const next = { ...base, ...overrides };
  const derivedNext = deriveTemplateEnv(next);

  for (const key of DERIVED_KEYS) {
    if (Object.hasOwn(overrides, key)) {
      continue;
    }

    const currentValue = previous[key];
    const defaultValue = DEFAULT_TEMPLATE_ENV[key];

    if (!currentValue || currentValue === defaultValue) {
      next[key] = derivedNext[key];
      continue;
    }

    if (key === "TEMPLATE_COOKIE_PREFIX" && currentValue === previous.TEMPLATE_PROJECT_ID) {
      next[key] = derivedNext[key];
      continue;
    }

    if (
      key === "TEMPLATE_DATABASE_NAME" &&
      currentValue === previous.TEMPLATE_PROJECT_ID
    ) {
      next[key] = derivedNext[key];
      continue;
    }

    if (
      key === "TEMPLATE_IMAGE_NAME_PREFIX" &&
      currentValue === previous.TEMPLATE_PROJECT_ID
    ) {
      next[key] = derivedNext[key];
      continue;
    }

    if (
      key === "TEMPLATE_DEPLOY_APPLICATION" &&
      currentValue === previous.TEMPLATE_PROJECT_ID
    ) {
      next[key] = derivedNext[key];
      continue;
    }

    if (
      key === "TEMPLATE_DEPLOY_EVENT_TYPE" &&
      currentValue === `promote-${previous.TEMPLATE_PROJECT_ID}`
    ) {
      next[key] = derivedNext[key];
      continue;
    }

    if (
      key === "TEMPLATE_ADMIN_EMAIL" &&
      currentValue === `admin@${previous.TEMPLATE_PROJECT_ID}.local`
    ) {
      next[key] = derivedNext[key];
      continue;
    }

    if (
      key === "TEMPLATE_CUSTOMER_EMAIL" &&
      currentValue === `customer@${previous.TEMPLATE_PROJECT_ID}.local`
    ) {
      next[key] = derivedNext[key];
      continue;
    }

    if (
      key === "TEMPLATE_JWT_ISSUER" &&
      currentValue === `${previous.TEMPLATE_PROJECT_ID}-backend`
    ) {
      next[key] = derivedNext[key];
      continue;
    }

    if (
      key === "TEMPLATE_JWT_AUDIENCE" &&
      currentValue === `${previous.TEMPLATE_PROJECT_ID}-clients`
    ) {
      next[key] = derivedNext[key];
    }
  }

  return deriveTemplateEnv(next);
}

export function resolveTemplateEnv(rootDir, overrides = {}) {
  const examplePath = path.join(rootDir, TEMPLATE_ENV_EXAMPLE_FILE);
  const rootPath = path.join(rootDir, TEMPLATE_ENV_FILE);

  const example = readEnvFile(examplePath);
  const existing = readEnvFile(rootPath);
  const fromProcess = pickProcessTemplateEnv();

  const base = deriveTemplateEnv({
    ...example,
    ...existing,
    ...fromProcess,
  });

  return applyProjectIdCascade(base, normalizeRecord(overrides));
}

export function renderTemplate(content, templateEnv) {
  return content.replace(TEMPLATE_PLACEHOLDER_PATTERN, (_full, key) => {
    return templateEnv[key] ?? "";
  });
}

export function serializeTemplateEnv(templateEnv) {
  const resolved = deriveTemplateEnv(templateEnv);
  return `${TEMPLATE_ENV_KEYS.map((key) => `${key}=${resolved[key] ?? ""}`).join("\n")}\n`;
}

export function writeTemplateEnvFile(filePath, templateEnv) {
  writeFileSync(filePath, serializeTemplateEnv(templateEnv));
}

export function getTemplateCookieKeys(templateEnv) {
  const resolved = deriveTemplateEnv(templateEnv);
  const prefix = resolved.TEMPLATE_COOKIE_PREFIX;

  return {
    adminAccessToken: `${prefix}_admin_access_token`,
    adminRefreshToken: `${prefix}_admin_refresh_token`,
    customerAccessToken: `${prefix}_access_token`,
    customerRefreshToken: `${prefix}_refresh_token`,
  };
}

export function getTemplateDisplayNames(templateEnv) {
  const resolved = deriveTemplateEnv(templateEnv);
  const brand = resolved.TEMPLATE_BRAND_NAME;

  return {
    brand,
    adminAppZh: `${brand} 管理后台`,
    adminAppEn: `${brand} Admin`,
    appZh: `${brand} 客户端`,
    appEn: `${brand} App`,
  };
}
