#!/usr/bin/env node
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

function normalizeString(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(normalizeString(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function patchNetworkTimeout(source, timeout) {
  const line = `networkTimeout=${timeout}`;
  if (/^networkTimeout=/m.test(source)) {
    return source.replace(/^networkTimeout=.*$/m, line);
  }
  return `${source.replace(/\s*$/, "\n")}${line}\n`;
}

function decodeGradleUrl(value) {
  return value.replaceAll("\\:", ":").replaceAll("\\/", "/");
}

function encodeGradleUrl(value) {
  return value.replace(/^([a-z][a-z0-9+.-]*):/i, "$1\\:");
}

function getDistributionUrl(source) {
  const line = source
    .split(/\r?\n/)
    .find((item) => item.startsWith("distributionUrl="));
  if (!line) {
    return "";
  }
  return decodeGradleUrl(line.slice("distributionUrl=".length));
}

function resolveDistributionUrl(source) {
  const current = getDistributionUrl(source);
  const explicit = normalizeString(process.env.GRADLE_DISTRIBUTION_URL);
  if (explicit) {
    return explicit;
  }

  const baseUrl = normalizeString(process.env.GRADLE_DISTRIBUTION_BASE_URL);
  if (!baseUrl || !current) {
    return current;
  }

  const fileName = path.posix.basename(new URL(current).pathname);
  return `${baseUrl.replace(/\/+$/, "")}/${fileName}`;
}

function patchDistributionUrl(source, distributionUrl) {
  if (!distributionUrl) {
    return source;
  }
  const line = `distributionUrl=${encodeGradleUrl(distributionUrl)}`;
  if (/^distributionUrl=/m.test(source)) {
    return source.replace(/^distributionUrl=.*$/m, line);
  }
  return `${source.replace(/\s*$/, "\n")}${line}\n`;
}

function writeOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }
  writeFileSync(outputPath, `${name}=${value}\n`, { flag: "a" });
}

const repoRoot = process.cwd();
const clientDir = path.resolve(
  repoRoot,
  normalizeString(process.env.CLIENT_DIR, "clients/app-tauri"),
);
const androidDir = path.resolve(
  repoRoot,
  normalizeString(
    process.env.ANDROID_PROJECT_DIR,
    path.join(clientDir, "src-tauri", "gen", "android"),
  ),
);
const wrapperPropertiesPath = path.join(
  androidDir,
  "gradle",
  "wrapper",
  "gradle-wrapper.properties",
);
const gradlewPath = path.join(
  androidDir,
  process.platform === "win32" ? "gradlew.bat" : "gradlew",
);
const timeout = normalizePositiveInteger(
  process.env.GRADLE_WRAPPER_NETWORK_TIMEOUT,
  120000,
);
const attempts = normalizePositiveInteger(
  process.env.GRADLE_WRAPPER_PRIME_ATTEMPTS,
  3,
);
const shouldDownload =
  normalizeString(process.env.GRADLE_WRAPPER_PRIME_DOWNLOAD, "true") !==
  "false";

if (!existsSync(wrapperPropertiesPath)) {
  console.log(`[android-gradle] skipped; wrapper properties missing: ${wrapperPropertiesPath}`);
  writeOutput("configured", "false");
  process.exit(0);
}

const original = readFileSync(wrapperPropertiesPath, "utf8");
const distributionUrl = resolveDistributionUrl(original);
const patched = patchNetworkTimeout(
  patchDistributionUrl(original, distributionUrl),
  timeout,
);
if (patched !== original) {
  writeFileSync(wrapperPropertiesPath, patched);
}

console.log(
  `[android-gradle] wrapper ready; timeout=${timeout}; distribution=${distributionUrl}`,
);
writeOutput("configured", "true");
writeOutput("network_timeout", String(timeout));
writeOutput("distribution_url", distributionUrl);

if (!shouldDownload) {
  console.log("[android-gradle] distribution download skipped by GRADLE_WRAPPER_PRIME_DOWNLOAD=false");
  process.exit(0);
}

if (!existsSync(gradlewPath)) {
  throw new Error(`Android Gradle wrapper 不存在: ${gradlewPath}`);
}

if (process.platform !== "win32") {
  chmodSync(gradlewPath, 0o755);
}

const gradleUserHome = normalizeString(
  process.env.GRADLE_USER_HOME,
  path.join(os.homedir(), ".gradle"),
);
const gradleOpts = [
  normalizeString(process.env.GRADLE_OPTS),
  `-Dorg.gradle.internal.http.connectionTimeout=${timeout}`,
  `-Dorg.gradle.internal.http.socketTimeout=${timeout}`,
]
  .filter(Boolean)
  .join(" ");

let lastStatus = 1;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  console.log(`[android-gradle] priming Gradle distribution ${attempt}/${attempts}`);
  const result = spawnSync(gradlewPath, ["--version", "--no-daemon"], {
    cwd: androidDir,
    stdio: "inherit",
    env: {
      ...process.env,
      GRADLE_OPTS: gradleOpts,
      GRADLE_USER_HOME: gradleUserHome,
    },
  });

  lastStatus = result.status ?? 1;
  if (lastStatus === 0) {
    console.log("[android-gradle] distribution primed");
    process.exit(0);
  }

  if (attempt < attempts) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000);
  }
}

process.exit(lastStatus);
