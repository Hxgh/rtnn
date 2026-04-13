import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

function readEnvValue(key: string) {
  const envPath = resolve(__dirname, '../.env');
  if (!existsSync(envPath)) {
    return undefined;
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
    return trimmed.slice(separatorIndex + 1).trim();
  }
  return undefined;
}

const defaultDatabaseUrl =
  'postgresql://postgres:postgres@localhost:5432/rtnn?schema=public';
const baseDatabaseUrl =
  process.env.DATABASE_URL ??
  readEnvValue('DATABASE_URL') ??
  defaultDatabaseUrl;
const schema = process.env.TEST_DATABASE_SCHEMA ?? 'backend_template_test';
const testDatabaseUrl = new URL(baseDatabaseUrl);

process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.TEST_BASE_DATABASE_URL = baseDatabaseUrl;
process.env.TEST_DATABASE_SCHEMA = schema;

testDatabaseUrl.searchParams.set('schema', schema);
process.env.DATABASE_URL = testDatabaseUrl.toString();
