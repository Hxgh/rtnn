const DEFAULT_TEST_DATABASE_SCHEMA_PREFIX = 'backend_template_test';
const MAX_POSTGRES_IDENTIFIER_LENGTH = 63;
const POSTGRES_IDENTIFIER_PATTERN = /^[a-z_][a-z0-9_]*$/;

type ResolveTestDatabaseSchemaOptions = {
  argv?: readonly string[];
  env?: NodeJS.ProcessEnv;
  pid?: number;
};

function normalizeIdentifierSegment(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  if (!normalized) {
    return 'test';
  }
  return /^[a-z_]/.test(normalized) ? normalized : `test_${normalized}`;
}

function inferSuiteName(env: NodeJS.ProcessEnv, argv: readonly string[]) {
  const source = [env.npm_lifecycle_event, ...argv].join(' ');
  if (/e2e/i.test(source)) {
    return 'e2e';
  }
  if (/integration/i.test(source)) {
    return 'integration';
  }
  return 'suite';
}

export function assertValidTestDatabaseSchema(schema: string) {
  if (
    schema.length === 0 ||
    schema.length > MAX_POSTGRES_IDENTIFIER_LENGTH ||
    !POSTGRES_IDENTIFIER_PATTERN.test(schema)
  ) {
    throw new Error(
      `Invalid TEST_DATABASE_SCHEMA "${schema}". Use 1-${MAX_POSTGRES_IDENTIFIER_LENGTH} lowercase letters, digits, or underscores, starting with a letter or underscore.`,
    );
  }
  return schema;
}

export function quotePostgresIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

export function buildDatabaseUrlWithSchema(
  databaseUrl: string,
  schema: string,
) {
  const nextUrl = new URL(databaseUrl);
  nextUrl.searchParams.set('schema', assertValidTestDatabaseSchema(schema));
  return nextUrl.toString();
}

export function resolveTestDatabaseSchema({
  argv = process.argv,
  env = process.env,
  pid = process.pid,
}: ResolveTestDatabaseSchemaOptions = {}) {
  const explicitSchema = env.TEST_DATABASE_SCHEMA?.trim();
  if (explicitSchema) {
    return assertValidTestDatabaseSchema(explicitSchema);
  }

  const prefix = normalizeIdentifierSegment(
    env.TEST_DATABASE_SCHEMA_PREFIX ?? DEFAULT_TEST_DATABASE_SCHEMA_PREFIX,
  );
  const suite = normalizeIdentifierSegment(inferSuiteName(env, argv));
  const worker = env.JEST_WORKER_ID
    ? `_w${normalizeIdentifierSegment(env.JEST_WORKER_ID)}`
    : '';
  const suffix = `${suite}_p${pid}${worker}`;
  const separatorLength = 1;
  const maxPrefixLength =
    MAX_POSTGRES_IDENTIFIER_LENGTH - suffix.length - separatorLength;
  const safePrefix = prefix
    .slice(0, Math.max(1, maxPrefixLength))
    .replace(/_+$/g, '');

  return assertValidTestDatabaseSchema(`${safePrefix || 'test'}_${suffix}`);
}

export function shouldKeepTestDatabaseSchema(env = process.env) {
  return env.TEST_KEEP_DATABASE_SCHEMA === '1';
}
