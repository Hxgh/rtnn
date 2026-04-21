import { spawnSync } from "node:child_process";
import {
  getBackendRuntimeEnv,
  resolveTemplateEnv,
} from "../lib/template-env.mjs";

function run(command, args, label, options = {}) {
  console.log(`[postgres-up] ${label}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isLocalHost(hostname) {
  return ["localhost", "127.0.0.1", "::1"].includes(hostname);
}

function resolveDatabaseUrl() {
  const templateEnv = resolveTemplateEnv(process.cwd());
  const backendEnv = getBackendRuntimeEnv(templateEnv);
  const databaseUrl = process.env.DATABASE_URL ?? backendEnv.DATABASE_URL;

  assert(databaseUrl, "无法解析 DATABASE_URL");
  return new URL(databaseUrl);
}

async function main() {
  const databaseUrl = resolveDatabaseUrl();
  const databaseHost = databaseUrl.hostname;

  if (!isLocalHost(databaseHost)) {
    console.log(
      `[postgres-up] 检测到外部数据库主机 ${databaseHost}，跳过本地 docker compose`,
    );
    return;
  }

  run(
    "docker",
    ["compose", "up", "-d", "--wait", "db"],
    `确保本地 PostgreSQL 已启动 (${databaseHost}:${databaseUrl.port || "5432"})`,
  );
}

main().catch((error) => {
  console.error(
    `[postgres-up] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
