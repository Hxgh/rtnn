import Joi from 'joi';
import { JWT_DEFAULTS, PORTS, TEMPLATE_IDENTITY } from '@rtnn/config';

export type NodeEnv = 'development' | 'test' | 'production';

export const DEFAULT_CORS_ORIGINS = [
  PORTS.admin,
  PORTS.app,
  PORTS.weappH5,
].flatMap((port) => [`http://localhost:${port}`, `http://127.0.0.1:${port}`]);

export interface AppEnv {
  NODE_ENV: NodeEnv;
  PORT: number;
  DATABASE_URL: string;
  CORS_ORIGINS: string[];
  LOGIN_RATE_LIMIT_WINDOW_SEC: number;
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS: number;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  DEPLOY_ENVIRONMENT: string;
  DEPLOY_VERSION: string;
  DEPLOY_SOURCE_SHA: string;
  BACKEND_IMAGE: string;
  CLIENT_RELEASE_FACTS_TOKEN: string;
}

export const DEFAULT_JWT_ACCESS_SECRET =
  'replace-this-with-a-long-random-string-access';
export const DEFAULT_JWT_REFRESH_SECRET =
  'replace-this-with-a-long-random-string-refresh';

export function normalizeCorsOrigins(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((origin) => String(origin).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const normalized = value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return [...DEFAULT_CORS_ORIGINS];
}

const envSchema = Joi.object<AppEnv>({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(PORTS.backend),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .default(
      `postgresql://postgres:postgres@localhost:55432/${TEMPLATE_IDENTITY.projectId}?schema=public`,
    ),
  CORS_ORIGINS: Joi.array()
    .items(Joi.string().uri({ scheme: ['http', 'https'] }))
    .min(1)
    .default(DEFAULT_CORS_ORIGINS),
  LOGIN_RATE_LIMIT_WINDOW_SEC: Joi.number().integer().min(30).default(300),
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS: Joi.number().integer().min(3).default(10),
  JWT_ISSUER: Joi.string().min(3).default(JWT_DEFAULTS.issuer),
  JWT_AUDIENCE: Joi.string().min(3).default(JWT_DEFAULTS.audience),
  JWT_ACCESS_SECRET: Joi.string().min(16).default(DEFAULT_JWT_ACCESS_SECRET),
  JWT_REFRESH_SECRET: Joi.string().min(16).default(DEFAULT_JWT_REFRESH_SECRET),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  DEPLOY_ENVIRONMENT: Joi.string().allow('').default('local'),
  DEPLOY_VERSION: Joi.string().allow('').default('local'),
  DEPLOY_SOURCE_SHA: Joi.string().allow('').default('unknown'),
  BACKEND_IMAGE: Joi.string().allow('').default('local'),
  CLIENT_RELEASE_FACTS_TOKEN: Joi.string().allow('').default(''),
});

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const validationResult = envSchema.validate(
    {
      ...config,
      CORS_ORIGINS: normalizeCorsOrigins(config.CORS_ORIGINS),
    },
    {
      abortEarly: false,
      allowUnknown: true,
      convert: true,
    },
  );
  const error = validationResult.error;
  const value = validationResult.value as AppEnv;

  if (error) {
    throw new Error(`Environment validation failed: ${error.message}`);
  }
  assertProductionSafeEnv(value);
  return value;
}

function isReleaseLikeEnv(value: AppEnv) {
  return (
    value.NODE_ENV === 'production' ||
    !['', 'local', 'test', 'development'].includes(value.DEPLOY_ENVIRONMENT)
  );
}

function assertProductionSafeEnv(value: AppEnv) {
  if (!isReleaseLikeEnv(value)) {
    return;
  }

  const failures: string[] = [];
  if (value.JWT_ACCESS_SECRET === DEFAULT_JWT_ACCESS_SECRET) {
    failures.push('JWT_ACCESS_SECRET must be replaced for production');
  }
  if (value.JWT_REFRESH_SECRET === DEFAULT_JWT_REFRESH_SECRET) {
    failures.push('JWT_REFRESH_SECRET must be replaced for production');
  }
  if (!value.CLIENT_RELEASE_FACTS_TOKEN.trim()) {
    failures.push('CLIENT_RELEASE_FACTS_TOKEN is required for production');
  }

  if (failures.length > 0) {
    throw new Error(`Environment validation failed: ${failures.join('; ')}`);
  }
}
