import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  TEMPLATE_ENV_FILE,
  getBackendRuntimeEnv,
  resolveTemplateEnv,
} from "./lib/template-env.mjs";

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
  const templateEnv = resolveTemplateEnv(process.cwd());
  const backendEnv = getBackendRuntimeEnv(templateEnv);
  const { NODE_ENV: _ignoredNodeEnv, ...sharedReleaseEnv } = backendEnv;
  const databaseUrl = process.env.DATABASE_URL ?? backendEnv.DATABASE_URL;

  assert(databaseUrl, `无法从 ${TEMPLATE_ENV_FILE} 或当前进程解析 DATABASE_URL`);

  const releaseSchema =
    process.env.RELEASE_DATABASE_SCHEMA ??
    `template_release_candidate_${Date.now()}`;
  const prismaUrl = new URL(databaseUrl);
  prismaUrl.searchParams.set("schema", releaseSchema);

  return {
    ...sharedReleaseEnv,
    ...process.env,
    PORT: process.env.PORT ?? backendEnv.PORT ?? "5100",
    DATABASE_URL: prismaUrl.toString(),
    TEST_BASE_DATABASE_URL: prismaUrl.toString(),
    TEST_DATABASE_SCHEMA:
      process.env.TEST_DATABASE_SCHEMA ?? `${releaseSchema}_test`,
  };
}

function main() {
  run("pnpm", ["run", "setup:env"], "生成环境文件");
  run("pnpm", ["run", "postgres:up"], "启动 PostgreSQL");

  assert(existsSync(TEMPLATE_ENV_FILE), `缺少环境文件 ${TEMPLATE_ENV_FILE}`);

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
