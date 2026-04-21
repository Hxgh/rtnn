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

const TEMPLATE_ENV_SECTIONS = [
  {
    title: "模板身份参数",
    description: "派生模板时优先修改这一组。",
    keys: [
      "TEMPLATE_PROJECT_ID",
      "TEMPLATE_BRAND_NAME",
      "TEMPLATE_COOKIE_PREFIX",
    ],
  },
  {
    title: "本地数据库参数",
    description: "用于本地 PostgreSQL 与 Prisma 运行时拼接。",
    keys: [
      "TEMPLATE_DATABASE_HOST",
      "TEMPLATE_DATABASE_PORT",
      "TEMPLATE_DATABASE_NAME",
      "TEMPLATE_DATABASE_USER",
      "TEMPLATE_DATABASE_PASSWORD",
    ],
  },
  {
    title: "本地端口参数",
    description: "各消费端与 backend 的默认开发端口。",
    keys: [
      "TEMPLATE_BACKEND_PORT",
      "TEMPLATE_ADMIN_PORT",
      "TEMPLATE_APP_PORT",
      "TEMPLATE_WEAPP_H5_PORT",
    ],
  },
  {
    title: "交付标识参数",
    description: "用于镜像命名、部署应用名和事件名。",
    keys: [
      "TEMPLATE_IMAGE_NAME_PREFIX",
      "TEMPLATE_DEPLOY_APPLICATION",
      "TEMPLATE_DEPLOY_EVENT_TYPE",
    ],
  },
  {
    title: "默认验证账号",
    description: "仅用于本地模板验证，派生项目应尽快替换。",
    keys: [
      "TEMPLATE_ADMIN_EMAIL",
      "TEMPLATE_ADMIN_PASSWORD",
      "TEMPLATE_ADMIN_DISPLAY_NAME",
      "TEMPLATE_CUSTOMER_EMAIL",
      "TEMPLATE_CUSTOMER_PASSWORD",
      "TEMPLATE_CUSTOMER_DISPLAY_NAME",
    ],
  },
  {
    title: "JWT 与安全参数",
    description: "正式部署前必须替换 secrets。",
    keys: [
      "TEMPLATE_JWT_ISSUER",
      "TEMPLATE_JWT_AUDIENCE",
      "TEMPLATE_JWT_ACCESS_SECRET",
      "TEMPLATE_JWT_REFRESH_SECRET",
      "TEMPLATE_JWT_ACCESS_EXPIRES_IN",
      "TEMPLATE_JWT_REFRESH_EXPIRES_IN",
    ],
  },
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
  TEMPLATE_DATABASE_PORT: "55432",
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
const SAFE_ENV_VALUE_PATTERN = /^[^\s"'#\\]+$/;

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

function parseQuotedEnvValue(rawValue) {
  if (
    rawValue.length >= 2 &&
    ((rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'")))
  ) {
    const body = rawValue.slice(1, -1);

    if (rawValue.startsWith('"')) {
      return body
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }

    return body;
  }

  return rawValue;
}

function serializeEnvValue(rawValue) {
  const value = String(rawValue ?? "");

  if (!value) {
    return '""';
  }

  if (SAFE_ENV_VALUE_PATTERN.test(value)) {
    return value;
  }

  return JSON.stringify(value);
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
    const value = parseQuotedEnvValue(line.slice(separatorIndex + 1).trim());
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
  const nextProjectId = overrides.TEMPLATE_PROJECT_ID;

  const cascadedValues = {
    TEMPLATE_COOKIE_PREFIX: nextProjectId,
    TEMPLATE_DATABASE_NAME: nextProjectId,
    TEMPLATE_IMAGE_NAME_PREFIX: nextProjectId,
    TEMPLATE_DEPLOY_APPLICATION: nextProjectId,
    TEMPLATE_DEPLOY_EVENT_TYPE: `promote-${nextProjectId}`,
    TEMPLATE_ADMIN_EMAIL: `admin@${nextProjectId}.local`,
    TEMPLATE_CUSTOMER_EMAIL: `customer@${nextProjectId}.local`,
    TEMPLATE_JWT_ISSUER: `${nextProjectId}-backend`,
    TEMPLATE_JWT_AUDIENCE: `${nextProjectId}-clients`,
  };

  for (const key of DERIVED_KEYS) {
    if (Object.hasOwn(overrides, key)) {
      continue;
    }

    const currentValue = previous[key];
    const defaultValue = DEFAULT_TEMPLATE_ENV[key];

    if (!currentValue || currentValue === defaultValue) {
      next[key] = cascadedValues[key];
      continue;
    }

    if (key === "TEMPLATE_COOKIE_PREFIX" && currentValue === previous.TEMPLATE_PROJECT_ID) {
      next[key] = cascadedValues[key];
      continue;
    }

    if (
      key === "TEMPLATE_DATABASE_NAME" &&
      currentValue === previous.TEMPLATE_PROJECT_ID
    ) {
      next[key] = cascadedValues[key];
      continue;
    }

    if (
      key === "TEMPLATE_IMAGE_NAME_PREFIX" &&
      currentValue === previous.TEMPLATE_PROJECT_ID
    ) {
      next[key] = cascadedValues[key];
      continue;
    }

    if (
      key === "TEMPLATE_DEPLOY_APPLICATION" &&
      currentValue === previous.TEMPLATE_PROJECT_ID
    ) {
      next[key] = cascadedValues[key];
      continue;
    }

    if (
      key === "TEMPLATE_DEPLOY_EVENT_TYPE" &&
      currentValue === `promote-${previous.TEMPLATE_PROJECT_ID}`
    ) {
      next[key] = cascadedValues[key];
      continue;
    }

    if (
      key === "TEMPLATE_ADMIN_EMAIL" &&
      currentValue === `admin@${previous.TEMPLATE_PROJECT_ID}.local`
    ) {
      next[key] = cascadedValues[key];
      continue;
    }

    if (
      key === "TEMPLATE_CUSTOMER_EMAIL" &&
      currentValue === `customer@${previous.TEMPLATE_PROJECT_ID}.local`
    ) {
      next[key] = cascadedValues[key];
      continue;
    }

    if (
      key === "TEMPLATE_JWT_ISSUER" &&
      currentValue === `${previous.TEMPLATE_PROJECT_ID}-backend`
    ) {
      next[key] = cascadedValues[key];
      continue;
    }

    if (
      key === "TEMPLATE_JWT_AUDIENCE" &&
      currentValue === `${previous.TEMPLATE_PROJECT_ID}-clients`
    ) {
      next[key] = cascadedValues[key];
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
  const lines = [];

  for (const section of TEMPLATE_ENV_SECTIONS) {
    if (lines.length > 0) {
      lines.push("");
    }

    lines.push(`# ${section.title}`);
    if (section.description) {
      lines.push(`# ${section.description}`);
    }

    for (const key of section.keys) {
      lines.push(`${key}=${serializeEnvValue(resolved[key])}`);
    }
  }

  return `${lines.join("\n")}\n`;
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

function pickTemplateEnvValues(templateEnv) {
  const resolved = deriveTemplateEnv(templateEnv);

  return Object.fromEntries(
    TEMPLATE_ENV_KEYS.map((key) => [key, resolved[key]]),
  );
}

function buildDatabaseUrl(templateEnv) {
  const resolved = deriveTemplateEnv(templateEnv);
  const username = encodeURIComponent(resolved.TEMPLATE_DATABASE_USER);
  const password = encodeURIComponent(resolved.TEMPLATE_DATABASE_PASSWORD);

  return `postgresql://${username}:${password}@${resolved.TEMPLATE_DATABASE_HOST}:${resolved.TEMPLATE_DATABASE_PORT}/${resolved.TEMPLATE_DATABASE_NAME}?schema=public`;
}

export function getBackendRuntimeEnv(templateEnv) {
  const resolved = deriveTemplateEnv(templateEnv);

  return {
    NODE_ENV: "development",
    PORT: resolved.TEMPLATE_BACKEND_PORT,
    DATABASE_URL: buildDatabaseUrl(resolved),
    LOGIN_RATE_LIMIT_WINDOW_SEC: "300",
    LOGIN_RATE_LIMIT_MAX_ATTEMPTS: "10",
    JWT_ISSUER: resolved.TEMPLATE_JWT_ISSUER,
    JWT_AUDIENCE: resolved.TEMPLATE_JWT_AUDIENCE,
    JWT_ACCESS_SECRET: resolved.TEMPLATE_JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: resolved.TEMPLATE_JWT_REFRESH_SECRET,
    JWT_ACCESS_EXPIRES_IN: resolved.TEMPLATE_JWT_ACCESS_EXPIRES_IN,
    JWT_REFRESH_EXPIRES_IN: resolved.TEMPLATE_JWT_REFRESH_EXPIRES_IN,
    ...pickTemplateEnvValues(resolved),
  };
}

export function getAdminRuntimeEnv(templateEnv) {
  const resolved = deriveTemplateEnv(templateEnv);
  const backendBaseUrl = `http://localhost:${resolved.TEMPLATE_BACKEND_PORT}`;

  return {
    NEXT_PUBLIC_API_BASE_URL: backendBaseUrl,
    NEXT_PUBLIC_BACKEND_URL: backendBaseUrl,
    BACKEND_INTERNAL_BASE_URL: backendBaseUrl,
    NEXT_PUBLIC_TEMPLATE_PROJECT_ID: resolved.TEMPLATE_PROJECT_ID,
    NEXT_PUBLIC_TEMPLATE_BRAND_NAME: resolved.TEMPLATE_BRAND_NAME,
    NEXT_PUBLIC_TEMPLATE_COOKIE_PREFIX: resolved.TEMPLATE_COOKIE_PREFIX,
    TEMPLATE_ADMIN_EMAIL: resolved.TEMPLATE_ADMIN_EMAIL,
    TEMPLATE_ADMIN_DISPLAY_NAME: resolved.TEMPLATE_ADMIN_DISPLAY_NAME,
    ...pickTemplateEnvValues(resolved),
  };
}

export function getAppRuntimeEnv(templateEnv) {
  const resolved = deriveTemplateEnv(templateEnv);
  const backendBaseUrl = `http://localhost:${resolved.TEMPLATE_BACKEND_PORT}`;

  return {
    NEXT_PUBLIC_API_BASE_URL: backendBaseUrl,
    BACKEND_INTERNAL_BASE_URL: backendBaseUrl,
    NEXT_PUBLIC_APP_NAME: resolved.TEMPLATE_PROJECT_ID,
    NEXT_PUBLIC_TEMPLATE_PROJECT_ID: resolved.TEMPLATE_PROJECT_ID,
    NEXT_PUBLIC_TEMPLATE_BRAND_NAME: resolved.TEMPLATE_BRAND_NAME,
    NEXT_PUBLIC_TEMPLATE_COOKIE_PREFIX: resolved.TEMPLATE_COOKIE_PREFIX,
    TEMPLATE_CUSTOMER_EMAIL: resolved.TEMPLATE_CUSTOMER_EMAIL,
    TEMPLATE_CUSTOMER_DISPLAY_NAME: resolved.TEMPLATE_CUSTOMER_DISPLAY_NAME,
    ...pickTemplateEnvValues(resolved),
  };
}

export function getWeappRuntimeEnv(templateEnv) {
  const resolved = deriveTemplateEnv(templateEnv);
  const backendBaseUrl = `http://127.0.0.1:${resolved.TEMPLATE_BACKEND_PORT}`;

  return {
    TARO_APP_API_BASE_URL: backendBaseUrl,
    TARO_APP_TEMPLATE_PROJECT_ID: resolved.TEMPLATE_PROJECT_ID,
    TARO_APP_TEMPLATE_BRAND_NAME: resolved.TEMPLATE_BRAND_NAME,
    TARO_APP_TEMPLATE_COOKIE_PREFIX: resolved.TEMPLATE_COOKIE_PREFIX,
    TARO_APP_TEMPLATE_CUSTOMER_EMAIL: resolved.TEMPLATE_CUSTOMER_EMAIL,
    ...pickTemplateEnvValues(resolved),
  };
}
