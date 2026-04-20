import { spawnSync } from "node:child_process";
import net from "node:net";
import {
  getBackendRuntimeEnv,
  resolveTemplateEnv,
} from "../lib/template-env.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

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

async function isPortBusy(hostname, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: hostname, port });

    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });

    socket.once("error", () => {
      resolve(false);
    });
  });
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
  const databasePort = Number(databaseUrl.port || "5432");
  const databaseHost = databaseUrl.hostname;

  if (await isPortBusy(databaseHost, databasePort)) {
    console.log(
      `[postgres-up] PostgreSQL 已可用，跳过 docker compose (${databaseHost}:${databasePort})`,
    );
    return;
  }

  run("docker", ["compose", "up", "-d", "--wait", "db"], "启动 PostgreSQL");
}

main().catch((error) => {
  console.error(
    `[postgres-up] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
