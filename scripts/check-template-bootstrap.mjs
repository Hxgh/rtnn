import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";

const apiBaseUrlOverride = process.env.API_BASE_URL;
const localeHeader = "zh-CN";
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

function parseEnvFile(filePath) {
  const payload = {};
  const content = readFileSync(filePath, "utf8");

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    payload[key] = value;
  }

  return payload;
}

function createBootstrapEnv() {
  const backendEnvFile = existsSync("backend/.env")
    ? "backend/.env"
    : "backend/.env.example";
  const backendEnv = parseEnvFile(backendEnvFile);
  const databaseUrl = process.env.DATABASE_URL ?? backendEnv.DATABASE_URL;

  assert(databaseUrl, `无法从 ${backendEnvFile} 解析 DATABASE_URL`);

  const prismaUrl = new URL(databaseUrl);
  prismaUrl.searchParams.set("schema", `template_bootstrap_${Date.now()}`);

  return {
    ...process.env,
    PORT: process.env.PORT ?? backendEnv.PORT ?? "5100",
    DATABASE_URL: prismaUrl.toString(),
    JWT_ISSUER: process.env.JWT_ISSUER ?? backendEnv.JWT_ISSUER,
    JWT_AUDIENCE: process.env.JWT_AUDIENCE ?? backendEnv.JWT_AUDIENCE,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? backendEnv.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? backendEnv.JWT_REFRESH_SECRET,
    JWT_ACCESS_EXPIRES_IN:
      process.env.JWT_ACCESS_EXPIRES_IN ?? backendEnv.JWT_ACCESS_EXPIRES_IN,
    JWT_REFRESH_EXPIRES_IN:
      process.env.JWT_REFRESH_EXPIRES_IN ?? backendEnv.JWT_REFRESH_EXPIRES_IN,
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
  const bootstrapEnv = createBootstrapEnv();
  const apiBaseUrl =
    apiBaseUrlOverride ?? `http://127.0.0.1:${bootstrapEnv.PORT}`;
  const url = new URL(apiBaseUrl);
  const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
  const hostname = url.hostname;

  assert(
    !(await isPortBusy(hostname, port)),
    `模板初始化校验需要独占 ${hostname}:${port}，请先关闭已有进程`,
  );

  run("pnpm", ["run", "setup:env"], "生成环境文件");

  for (const file of envFiles) {
    assert(existsSync(file), `缺少环境文件 ${file}`);
  }

  const schemaName = new URL(bootstrapEnv.DATABASE_URL).searchParams.get("schema");
  console.log(`[bootstrap-check] 使用临时 Prisma schema=${schemaName}`);

  run("pnpm", ["run", "setup:backend"], "初始化 backend 数据库", {
    env: bootstrapEnv,
  });
  run("pnpm", ["run", "build:backend"], "构建 backend");

  console.log("[bootstrap-check] 启动 backend");
  const server = spawn("pnpm", ["-C", "backend", "start:prod"], {
    stdio: "inherit",
    shell: false,
    env: bootstrapEnv,
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
