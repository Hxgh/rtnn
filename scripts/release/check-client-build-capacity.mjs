#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

function normalizeString(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function parseNonNegativeInt(value, fallback) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return fallback;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseDf(output) {
  const lines = output.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    throw new Error(`无法解析 df 输出: ${output}`);
  }

  const columns = lines.at(-1).trim().split(/\s+/);
  const availableMb = Number.parseInt(columns[3] ?? "", 10);
  const usedPercent = columns[4] ?? "";

  if (!Number.isInteger(availableMb)) {
    throw new Error(`无法解析可用磁盘容量: ${lines.at(-1)}`);
  }

  return { availableMb, usedPercent };
}

function main() {
  const minFreeMb = parseNonNegativeInt(
    process.env.CLIENT_BUILD_MIN_FREE_DISK_MB,
    2048,
  );

  if (minFreeMb === 0) {
    console.log("[client-build-capacity] skipped: min-free-mb=0");
    return;
  }

  const checkPath = path.resolve(
    process.cwd(),
    normalizeString(process.env.CLIENT_BUILD_CAPACITY_PATH, "."),
  );

  if (!existsSync(checkPath)) {
    throw new Error(`客户端构建容量检查路径不存在: ${checkPath}`);
  }

  const result = spawnSync("df", ["-Pm", checkPath], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(
      `df -Pm ${checkPath} 执行失败: ${result.stderr || result.stdout}`,
    );
  }

  const { availableMb, usedPercent } = parseDf(result.stdout);
  console.log(
    `[client-build-capacity] path=${checkPath} available=${availableMb}MB required=${minFreeMb}MB used=${usedPercent}`,
  );

  if (availableMb < minFreeMb) {
    throw new Error(
      `客户端构建磁盘空间不足: ${availableMb}MB free, require ${minFreeMb}MB. Clean runner artifacts or use a dedicated/GitHub-hosted runner.`,
    );
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
