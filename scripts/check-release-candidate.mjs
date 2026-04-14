import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readEnvFile } from "./lib/template-env.mjs";

const envFiles = [
  ".env",
  "backend/.env",
  "admin/.env.local",
  "app/.env.local",
  "weapp/.env",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run(command, args, label, options = {}) {
  console.log(`[release-check] ${label}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function createReleaseCheckEnv() {
  const backendEnvFile = existsSync("backend/.env")
    ? "backend/.env"
    : "backend/.env.example";
  const backendEnv = readEnvFile(backendEnvFile);
  const databaseUrl = process.env.DATABASE_URL ?? backendEnv.DATABASE_URL;

  assert(databaseUrl, `无法从 ${backendEnvFile} 解析 DATABASE_URL`);

  const releaseSchema =
    process.env.RELEASE_DATABASE_SCHEMA ??
    `template_release_candidate_${Date.now()}`;
  const prismaUrl = new URL(databaseUrl);
  prismaUrl.searchParams.set("schema", releaseSchema);

  return {
    ...process.env,
    PORT: process.env.PORT ?? backendEnv.PORT ?? "5100",
    DATABASE_URL: prismaUrl.toString(),
    TEST_BASE_DATABASE_URL: prismaUrl.toString(),
    TEST_DATABASE_SCHEMA:
      process.env.TEST_DATABASE_SCHEMA ?? `${releaseSchema}_test`,
    JWT_ISSUER: process.env.JWT_ISSUER ?? backendEnv.JWT_ISSUER,
    JWT_AUDIENCE: process.env.JWT_AUDIENCE ?? backendEnv.JWT_AUDIENCE,
    JWT_ACCESS_SECRET:
      process.env.JWT_ACCESS_SECRET ?? backendEnv.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET:
      process.env.JWT_REFRESH_SECRET ?? backendEnv.JWT_REFRESH_SECRET,
    JWT_ACCESS_EXPIRES_IN:
      process.env.JWT_ACCESS_EXPIRES_IN ?? backendEnv.JWT_ACCESS_EXPIRES_IN,
    JWT_REFRESH_EXPIRES_IN:
      process.env.JWT_REFRESH_EXPIRES_IN ?? backendEnv.JWT_REFRESH_EXPIRES_IN,
  };
}

function main() {
  run("pnpm", ["run", "setup:env"], "生成环境文件");
  run("pnpm", ["run", "postgres:up"], "启动 PostgreSQL");

  for (const file of envFiles) {
    assert(existsSync(file), `缺少环境文件 ${file}`);
  }

  const releaseEnv = createReleaseCheckEnv();
  const releaseUrl = new URL(releaseEnv.DATABASE_URL);

  console.log(
    `[release-check] 使用临时 Prisma schema=${releaseUrl.searchParams.get("schema")}`,
  );
  console.log(
    `[release-check] 使用测试 Prisma schema=${releaseEnv.TEST_DATABASE_SCHEMA}`,
  );

  run("pnpm", ["run", "check:contracts"], "检查契约漂移", {
    env: releaseEnv,
  });
  run("pnpm", ["run", "check:backend-release"], "检查 backend 发布基线", {
    env: releaseEnv,
  });
  run("pnpm", ["run", "check:template-delivery"], "检查多端交付烟测", {
    env: releaseEnv,
  });

  console.log("[release-check] release candidate 校验通过");
}

main();
