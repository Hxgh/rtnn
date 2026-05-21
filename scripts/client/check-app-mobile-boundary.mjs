import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT_DIR = path.resolve(import.meta.dirname, "..", "..");

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: ROOT_DIR,
    encoding: "utf8",
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
  }

  return result.stdout;
}

function read(filePath) {
  return readFileSync(path.join(ROOT_DIR, filePath), "utf8");
}

function listTrackedAppFiles() {
  return runGit(["ls-files", "-z", "apps/app/app", "apps/app/components", "apps/app/lib/native-core"])
    .split("\0")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((filePath) => /\.(tsx?|mjs|json)$/.test(filePath));
}

function addFinding(findings, filePath, message) {
  findings.push(`[app-mobile] ${filePath}: ${message}`);
}

function checkStartupPermissions(findings) {
  const providerPath = "apps/app/components/providers/native-runtime-provider.tsx";
  const permissionPath = "apps/app/lib/native-core/permissions.ts";
  const provider = read(providerPath);
  const permissions = read(permissionPath);

  if (provider.includes('"request"') || provider.includes("'request'")) {
    addFinding(findings, providerPath, "移动端启动阶段不应支持 request 权限模式");
  }

  if (/NativePermissionStartupMode\s*=\s*[^;]*request/.test(permissions)) {
    addFinding(findings, permissionPath, "启动权限模式不应包含 request");
  }

  if (/mode\s*===\s*["']request["']|ensurePermission\(\{[\s\S]{0,180}trigger:\s*["']startup["']/.test(permissions)) {
    addFinding(findings, permissionPath, "启动权限只能 check，不应 ensure/request");
  }
}

function checkNotificationBoundary(findings) {
  const corePath = "apps/app/lib/native-core/notifications.ts";
  const servicePath = "apps/app/lib/native-core/service.ts";
  const core = read(corePath);
  const service = read(servicePath);

  if (/title:\s*["']RTNN["']|你已开启客户端通知|rtnn-device-service/.test(core)) {
    addFinding(findings, corePath, "native-core 通知能力不应硬编码品牌或业务文案");
  }

  if (/showNotification\(\)\s*\{/.test(service)) {
    addFinding(findings, servicePath, "showNotification 应由业务层传入 payload");
  }
}

function checkLoadingBoundary(findings) {
  const filePath = "apps/app/app/loading.tsx";
  const content = read(filePath);
  if (/sr-only/.test(content) && !/role=["']status["']/.test(content)) {
    addFinding(findings, filePath, "全局 loading 不应是纯 sr-only 白屏");
  }
}

function checkLowFrequencyPrefetch(findings, filePath, content) {
  if (!filePath.includes("device-services")) {
    return;
  }

  if (/href=["']\/device-services\/(?:scan|map|media|notification|safe-area)["'][\s\S]{0,180}?title=/.test(content) && !/prefetch=\{false\}/.test(content)) {
    addFinding(findings, filePath, "设备服务低频入口应关闭 Link prefetch");
  }
}

function checkDemoData(findings, filePath, content) {
  if (/杭州西湖|30\.2741|120\.1551/.test(content)) {
    addFinding(findings, filePath, "正式移动端能力页不应保留演示地点数据");
  }
}

function main() {
  const findings = [];

  checkStartupPermissions(findings);
  checkNotificationBoundary(findings);
  checkLoadingBoundary(findings);

  for (const filePath of listTrackedAppFiles()) {
    const content = read(filePath);
    checkLowFrequencyPrefetch(findings, filePath, content);
    checkDemoData(findings, filePath, content);
  }

  if (findings.length > 0) {
    for (const finding of findings) {
      console.error(finding);
    }
    throw new Error("移动端边界校验失败");
  }

  console.log("[app-mobile] 移动端边界校验通过");
}

main();
