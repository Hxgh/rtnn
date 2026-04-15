import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT_ENV_PATHS = [
  resolve(__dirname, '../../../.env'),
  resolve(__dirname, '../../../.env.example'),
];

const DEFAULT_TEMPLATE_ENV = {
  TEMPLATE_DATABASE_HOST: 'localhost',
  TEMPLATE_DATABASE_PORT: '5432',
  TEMPLATE_DATABASE_NAME: 'rtnn',
  TEMPLATE_DATABASE_USER: 'postgres',
  TEMPLATE_DATABASE_PASSWORD: 'postgres',
};

function readEnvValue(key: string) {
  for (const envPath of ROOT_ENV_PATHS) {
    if (!existsSync(envPath)) {
      continue;
    }

    const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex < 0) {
        continue;
      }
      const name = trimmed.slice(0, separatorIndex).trim();
      if (name !== key) {
        continue;
      }
      return trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    }
  }

  return undefined;
}

function getTemplateEnvValue(
  key: keyof typeof DEFAULT_TEMPLATE_ENV,
): string {
  return readEnvValue(key) ?? DEFAULT_TEMPLATE_ENV[key];
}

function buildDefaultDatabaseUrl() {
  const username = encodeURIComponent(getTemplateEnvValue('TEMPLATE_DATABASE_USER'));
  const password = encodeURIComponent(
    getTemplateEnvValue('TEMPLATE_DATABASE_PASSWORD'),
  );
  const host = getTemplateEnvValue('TEMPLATE_DATABASE_HOST');
  const port = getTemplateEnvValue('TEMPLATE_DATABASE_PORT');
  const databaseName = getTemplateEnvValue('TEMPLATE_DATABASE_NAME');

  return `postgresql://${username}:${password}@${host}:${port}/${databaseName}?schema=public`;
}

const baseDatabaseUrl =
  process.env.TEST_BASE_DATABASE_URL ??
  process.env.DATABASE_URL ??
  buildDefaultDatabaseUrl();
const schema = process.env.TEST_DATABASE_SCHEMA ?? 'backend_template_test';
const testDatabaseUrl = new URL(baseDatabaseUrl);

process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.TEST_BASE_DATABASE_URL = baseDatabaseUrl;
process.env.TEST_DATABASE_SCHEMA = schema;

testDatabaseUrl.searchParams.set('schema', schema);
process.env.DATABASE_URL = testDatabaseUrl.toString();
