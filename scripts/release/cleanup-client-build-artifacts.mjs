#!/usr/bin/env node

import { existsSync, rmSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();

function normalizeString(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function requireEnv(name) {
  const value = normalizeString(process.env[name]);
  if (!value) {
    throw new Error(`缺少环境变量: ${name}`);
  }

  return value;
}

function isInside(candidate, root) {
  const relative = path.relative(root, candidate);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function requireInside(candidate, root, label) {
  if (!isInside(candidate, root)) {
    throw new Error(`${label} 超出允许清理范围: ${candidate}`);
  }
}

function removeIfExists(candidate, removed) {
  if (!existsSync(candidate)) {
    return;
  }

  rmSync(candidate, { recursive: true, force: true });
  removed.push(path.relative(ROOT_DIR, candidate) || candidate);
}

function main() {
  const clientDir = path.resolve(ROOT_DIR, requireEnv("CLIENT_DIR"));
  requireInside(clientDir, ROOT_DIR, "CLIENT_DIR");

  const srcTauriDir = path.join(clientDir, "src-tauri");
  const androidDir = path.join(srcTauriDir, "gen", "android");
  const cleanupTargets = [
    path.join(srcTauriDir, "target"),
    path.join(androidDir, "app", "build"),
    path.join(androidDir, "app", ".cxx"),
    path.join(androidDir, "build"),
    path.join(androidDir, ".gradle"),
    path.join(androidDir, ".kotlin"),
  ];

  const runnerTemp = normalizeString(process.env.RUNNER_TEMP);
  if (runnerTemp) {
    const runnerTempDir = path.resolve(runnerTemp);
    const tauriTargetDir = path.join(runnerTempDir, "rtnn-tauri-target");
    requireInside(tauriTargetDir, runnerTempDir, "RUNNER_TEMP target");
    cleanupTargets.push(tauriTargetDir);
  }

  for (const target of cleanupTargets) {
    if (target.startsWith(srcTauriDir)) {
      requireInside(target, srcTauriDir, "client build artifact");
    }
  }

  const removed = [];
  for (const target of cleanupTargets) {
    removeIfExists(target, removed);
  }

  if (removed.length === 0) {
    console.log("[client-build-cleanup] no generated build artifacts found");
    return;
  }

  for (const item of removed) {
    console.log(`[client-build-cleanup] removed ${item}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
