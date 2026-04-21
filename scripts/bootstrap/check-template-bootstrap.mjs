import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import {
  TEMPLATE_ENV_FILE,
  getBackendRuntimeEnv,
  resolveTemplateEnv,
} from "../lib/template-env.mjs";

const apiBaseUrlOverride = process.env.API_BASE_URL;
const localeHeader = "zh-CN";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run(command, args, label, options = {}) {
  console.log(`[bootstrap-check] ${label}`);
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

async function expectJson(url, label) {
  const response = await fetch(url, {
    headers: {
      "accept-language": localeHeader,
    },
  });
  const text = await response.text();

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`${label} 返回了非 JSON 响应: ${text.slice(0, 300)}`);
  }

  if (!response.ok) {
    throw new Error(
      `${label} 失败: HTTP ${response.status} ${response.statusText} ${JSON.stringify(payload).slice(0, 400)}`,
    );
  }

  return payload;
}

function createBootstrapEnv() {
  const templateEnv = resolveTemplateEnv(process.cwd());
  const backendEnv = getBackendRuntimeEnv(templateEnv);
  const databaseUrl = process.env.DATABASE_URL ?? backendEnv.DATABASE_URL;

  assert(databaseUrl, `无法从 ${TEMPLATE_ENV_FILE} 或当前进程解析 DATABASE_URL`);

  const prismaUrl = new URL(databaseUrl);
  prismaUrl.searchParams.set("schema", `template_bootstrap_${Date.now()}`);

  return {
    ...backendEnv,
    ...process.env,
    PORT: process.env.PORT ?? backendEnv.PORT ?? "5100",
    DATABASE_URL: prismaUrl.toString(),
  };
}

async function waitForJson(url, label, validate, options) {
  const { timeoutMs, server } = options;
  const deadline = Date.now() + timeoutMs;
  let lastError = "unknown";

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`backend 进程已提前退出，exitCode=${server.exitCode}`);
    }

    try {
      const payload = await expectJson(url, label);
      validate(payload);
      return payload;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await delay(500);
    }
  }

  throw new Error(`${label} 未在 ${timeoutMs}ms 内就绪: ${lastError}`);
}

async function stopServer(server) {
  if (server.exitCode !== null) {
    return;
  }

  server.kill("SIGTERM");

  try {
    await Promise.race([
      once(server, "exit"),
      delay(5000).then(async () => {
        if (server.exitCode === null) {
          server.kill("SIGKILL");
          await once(server, "exit");
        }
      }),
    ]);
  } catch {
    // ignore cleanup failures
  }
}

async function main() {
  run("pnpm", ["run", "setup:env"], "生成环境文件");

  assert(existsSync(TEMPLATE_ENV_FILE), `缺少环境文件 ${TEMPLATE_ENV_FILE}`);

  const bootstrapEnv = createBootstrapEnv();
  run("pnpm", ["run", "postgres:up"], "确保 PostgreSQL 已启动");

  const apiBaseUrl =
    apiBaseUrlOverride ?? `http://127.0.0.1:${bootstrapEnv.PORT}`;
  const url = new URL(apiBaseUrl);
  const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
  const hostname = url.hostname;

  assert(
    !(await isPortBusy(hostname, port)),
    `模板初始化校验需要独占 ${hostname}:${port}，请先关闭已有进程`,
  );

  const schemaName = new URL(bootstrapEnv.DATABASE_URL).searchParams.get("schema");
  console.log(`[bootstrap-check] 使用临时 Prisma schema=${schemaName}`);

  run("pnpm", ["run", "setup:backend"], "初始化 backend 数据库", {
    env: bootstrapEnv,
  });
  run("pnpm", ["run", "build:backend"], "构建 backend");

  console.log("[bootstrap-check] 启动 backend");
  const server = spawn("node", ["dist/main"], {
    stdio: "inherit",
    shell: false,
    env: bootstrapEnv,
    cwd: "apps/backend",
  });

  try {
    const [healthz, readyz, openapi] = await Promise.all([
      waitForJson(`${apiBaseUrl}/healthz`, "healthz", (payload) => {
        assert(payload.status === "ok", "healthz 状态不正确");
      }, { timeoutMs: 30000, server }),
      waitForJson(`${apiBaseUrl}/readyz`, "readyz", (payload) => {
        assert(payload.status === "ready", "readyz 状态不正确");
        assert(payload.database === "up", "readyz 数据库状态不正确");
      }, { timeoutMs: 30000, server }),
      waitForJson(`${apiBaseUrl}/openapi.json`, "openapi", (payload) => {
        assert(payload.paths?.["/api/v1/auth/admin/login"], "OpenAPI 缺少管理员登录接口");
        assert(payload.paths?.["/api/v1/auth/customer/login"], "OpenAPI 缺少客户登录接口");
        assert(!payload.paths?.["/api/v1/system/me"], "OpenAPI 仍然暴露了 system/me");
      }, { timeoutMs: 30000, server }),
    ]);

    console.log(`[bootstrap-check] healthz=${healthz.status}`);
    console.log(`[bootstrap-check] readyz=${readyz.status}/${readyz.database}`);
    console.log(`[bootstrap-check] openapi title=${openapi.info?.title ?? "unknown"}`);
    console.log("[bootstrap-check] 模板初始化校验通过");
  } finally {
    await stopServer(server);
  }
}

main().catch((error) => {
  console.error(
    `\n[bootstrap-check] 失败：${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
