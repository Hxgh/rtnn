import { spawn } from "node:child_process";

const MAX_POSTGRES_IDENTIFIER_LENGTH = 63;
const PARALLEL_SCHEMA_PREFIX_MAX_LENGTH = 30;

const commands = [
  {
    label: "backend:test:integration",
    suite: "integration",
    args: ["--filter", "backend", "test:integration"],
  },
  {
    label: "backend:test:e2e",
    suite: "e2e",
    args: ["--filter", "backend", "test:e2e"],
  },
];

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

function buildChildSchema(suite) {
  const prefix = normalizeIdentifierSegment(
    process.env.TEST_DATABASE_SCHEMA_PREFIX ??
      process.env.TEST_DATABASE_SCHEMA ??
      "backend_template_test",
  );
  const safePrefix = prefix
    .slice(0, PARALLEL_SCHEMA_PREFIX_MAX_LENGTH)
    .replace(/_+$/g, "");
  const suffix = `parallel_${normalizeIdentifierSegment(suite)}_p${process.pid}`;

  const schema = `${safePrefix || "test"}_${suffix}`;
  if (schema.length > MAX_POSTGRES_IDENTIFIER_LENGTH) {
    throw new Error(
      `Generated TEST_DATABASE_SCHEMA is too long: ${schema.length}/${MAX_POSTGRES_IDENTIFIER_LENGTH}`,
    );
  }
  return schema;
}

const children = commands.map(({ label, suite, args }) => {
  const testSchema = buildChildSchema(suite);
  console.log(`[backend-tests-parallel] ${label} schema=${testSchema}`);

  const child = spawn("pnpm", args, {
    env: {
      ...process.env,
      TEST_DATABASE_SCHEMA: testSchema,
    },
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(prefixLines(label, chunk));
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(prefixLines(label, chunk));
  });

  return new Promise((resolve) => {
    child.on("exit", (code, signal) => {
      resolve({ label, code: code ?? 1, signal });
    });
  });
});

const results = await Promise.all(children);
const failed = results.filter((result) => result.code !== 0 || result.signal);

if (failed.length > 0) {
  for (const result of failed) {
    console.error(
      `[backend-tests-parallel] ${result.label} failed with ${
        result.signal ? `signal ${result.signal}` : `exit code ${result.code}`
      }`,
    );
  }
  process.exit(1);
}

console.log("[backend-tests-parallel] integration/e2e 并行测试通过");

function prefixLines(label, chunk) {
  return String(chunk)
    .split(/(\r?\n)/)
    .map((part) => {
      if (!part || /^\r?\n$/.test(part)) {
        return part;
      }
      return `[${label}] ${part}`;
    })
    .join("");
}
