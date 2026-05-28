import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getBackendRuntimeEnv,
  resolveTemplateEnv,
} from "../lib/template-env.mjs";

const DEFAULT_TEST_DATABASE_SCHEMA_PREFIX = "backend_template_test";
const MAX_POSTGRES_IDENTIFIER_LENGTH = 63;
const PARALLEL_SCHEMA_PREFIX_MAX_LENGTH = 30;
const POSTGRES_IDENTIFIER_PATTERN = /^[a-z_][a-z0-9_]*$/;

const args = new Set(process.argv.slice(2));
const shouldPrune = args.has("--prune");
const reportOnly = args.has("--report-only");

function normalizeIdentifierSegment(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  if (!normalized) {
    return "test";
  }
  return /^[a-z_]/.test(normalized) ? normalized : `test_${normalized}`;
}

function assertValidIdentifier(identifier, label) {
  if (
    identifier.length === 0 ||
    identifier.length > MAX_POSTGRES_IDENTIFIER_LENGTH ||
    !POSTGRES_IDENTIFIER_PATTERN.test(identifier)
  ) {
    throw new Error(
      `${label}=${identifier} 不是合法 PostgreSQL schema 标识符；请使用 1-${MAX_POSTGRES_IDENTIFIER_LENGTH} 位小写字母、数字或下划线，并以字母或下划线开头。`,
    );
  }
  return identifier;
}

function quotePostgresIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function escapePostgresLike(value) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function buildParallelSchemaPrefix(prefix) {
  return assertValidIdentifier(
    prefix.slice(0, PARALLEL_SCHEMA_PREFIX_MAX_LENGTH).replace(/_+$/g, "") ||
      "test",
    "parallel TEST_DATABASE_SCHEMA_PREFIX",
  );
}

function resolveWorkspaceRoot() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, "../..");
}

function resolveDatabaseUrl(workspaceRoot) {
  const templateEnv = resolveTemplateEnv(workspaceRoot);
  const backendEnv = getBackendRuntimeEnv(templateEnv);
  const databaseUrl =
    process.env.TEST_BASE_DATABASE_URL ??
    process.env.DATABASE_URL ??
    backendEnv.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("无法解析 TEST_BASE_DATABASE_URL 或 DATABASE_URL");
  }

  const url = new URL(databaseUrl);
  url.searchParams.set("schema", "public");
  return url.toString();
}

function resolveSchemaSelectors() {
  const explicitSchema = process.env.TEST_DATABASE_SCHEMA?.trim();
  const prefixSource =
    process.env.TEST_DATABASE_SCHEMA_PREFIX ??
    explicitSchema ??
    DEFAULT_TEST_DATABASE_SCHEMA_PREFIX;
  const prefix = assertValidIdentifier(
    normalizeIdentifierSegment(prefixSource),
    "TEST_DATABASE_SCHEMA_PREFIX",
  );
  const exactSchemas = new Set();

  if (explicitSchema) {
    exactSchemas.add(
      assertValidIdentifier(
        normalizeIdentifierSegment(explicitSchema),
        "TEST_DATABASE_SCHEMA",
      ),
    );
  }

  exactSchemas.add(prefix);

  return {
    exactSchemas: [...exactSchemas],
    prefixes: [...new Set([prefix, buildParallelSchemaPrefix(prefix)])],
  };
}

function loadPrismaClient(workspaceRoot) {
  const requireFromBackend = createRequire(
    path.join(workspaceRoot, "apps/backend/package.json"),
  );
  return requireFromBackend("@prisma/client").PrismaClient;
}

async function listMatchingSchemas(prisma, selectors) {
  const patterns = selectors.prefixes.map(
    (prefix) => `${escapePostgresLike(prefix)}\\_%`,
  );
  const likeClauses = patterns.map(
    (_pattern, index) => `nspname LIKE $${index + 2} ESCAPE '\\'`,
  );
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT nspname
      FROM pg_namespace
      WHERE nspname = ANY($1)
         OR ${likeClauses.join("\n         OR ")}
      ORDER BY nspname ASC
    `,
    selectors.exactSchemas,
    ...patterns,
  );

  return rows.map((row) => row.nspname);
}

async function dropSchemas(prisma, schemas) {
  for (const schema of schemas) {
    await prisma.$executeRawUnsafe(
      `DROP SCHEMA IF EXISTS ${quotePostgresIdentifier(schema)} CASCADE`,
    );
    console.log(`[backend-test-schemas] 已删除残留 schema=${schema}`);
  }
}

async function main() {
  const workspaceRoot = resolveWorkspaceRoot();
  const PrismaClient = loadPrismaClient(workspaceRoot);
  const databaseUrl = resolveDatabaseUrl(workspaceRoot);
  const selectors = resolveSchemaSelectors();
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  let exitCode = 0;

  try {
    const schemas = await listMatchingSchemas(prisma, selectors);

    if (schemas.length === 0) {
      console.log(
        `[backend-test-schemas] 未发现测试 schema 残留 prefixes=${selectors.prefixes.join(",")}`,
      );
      return;
    }

    console.error(
      `[backend-test-schemas] 发现 ${schemas.length} 个测试 schema 残留:`,
    );
    for (const schema of schemas) {
      console.error(`- ${schema}`);
    }

    if (shouldPrune) {
      await dropSchemas(prisma, schemas);
      return;
    }

    console.error(
      "\n如确认这些 schema 均为测试残留，可执行 pnpm run check:backend-test-schemas -- --prune 清理。\n",
    );

    if (!reportOnly) {
      exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

main().catch((error) => {
  console.error(
    `[backend-test-schemas] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
