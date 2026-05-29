#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const LOCAL_SKIP_EXIT_CODE = 80;

function usage() {
  return `Usage:
  node scripts/runtime/run-playwright-ui-smoke.mjs -c <playwright-config> [...args]
  node scripts/runtime/run-playwright-ui-smoke.mjs --preflight

This wrapper is for CI Playwright UI smoke checks. In local Codex App work,
use the built-in Browser plugin for page verification instead of installing
Playwright Chromium.
`;
}

function shouldFailWhenMissing() {
  return (
    process.env.CI === "true" ||
    process.env.RTNN_RUN_UI_SMOKE === "true" ||
    process.env.RTNN_REQUIRE_PLAYWRIGHT_UI === "true" ||
    process.env.RTNN_ALLOW_LOCAL_PLAYWRIGHT_UI === "true"
  );
}

async function hasBundledChromium() {
  if (process.env.RTNN_TEST_FORCE_MISSING_PLAYWRIGHT_BROWSER === "true") {
    return false;
  }

  const channel = process.env.PLAYWRIGHT_CHROMIUM_CHANNEL?.trim();
  if (channel) {
    console.log(`[ui-smoke] 使用 Playwright Chromium channel=${channel}`);
    return true;
  }

  try {
    const { chromium } = await import("playwright");
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
}

function printMissingBrowserMessage() {
  const write = shouldFailWhenMissing() ? console.error : console.log;
  write(
    [
      "[ui-smoke] 未发现本机 Playwright Chromium，已跳过本地 Playwright UI smoke。",
      "[ui-smoke] Codex App 本地页面验收请使用内置 Browser；不要为普通本地核验安装 Chromium。",
      "[ui-smoke] CI workflow 会在需要 UI smoke 时显式安装 Playwright Chromium。",
      "[ui-smoke] 如确需本机运行 Playwright UI smoke，请自行配置浏览器后设置 RTNN_ALLOW_LOCAL_PLAYWRIGHT_UI=true。",
    ].join("\n"),
  );
}

function runPlaywright(args) {
  const env = {
    ...process.env,
    FORCE_COLOR: "0",
  };
  delete env.NO_COLOR;

  const result = spawnSync("pnpm", ["exec", "playwright", "test", ...args], {
    stdio: "inherit",
    shell: false,
    env,
  });

  if (result.signal) {
    process.kill(process.pid, result.signal);
    return;
  }

  process.exit(result.status ?? 1);
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(usage());
    process.exit(args.length === 0 ? 1 : 0);
  }

  const preflightOnly = args.includes("--preflight");
  if (!(await hasBundledChromium())) {
    printMissingBrowserMessage();
    process.exit(shouldFailWhenMissing() ? 1 : LOCAL_SKIP_EXIT_CODE);
  }

  if (preflightOnly) {
    console.log("[ui-smoke] Playwright Chromium 可用");
    return;
  }

  runPlaywright(args);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
