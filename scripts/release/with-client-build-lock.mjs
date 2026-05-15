#!/usr/bin/env node

import { mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

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

function sleep(seconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, seconds * 1000);
}

function sanitizeName(value) {
  return normalizeString(value, "rtnn-client-build").replace(
    /[^0-9A-Za-z._-]+/g,
    "-",
  );
}

function defaultOwner() {
  return [
    normalizeString(process.env.GITHUB_REPOSITORY, "local"),
    normalizeString(process.env.GITHUB_WORKFLOW, "manual"),
    normalizeString(process.env.GITHUB_RUN_ID, String(process.pid)),
    normalizeString(process.env.GITHUB_RUN_ATTEMPT, "1"),
    normalizeString(process.env.GITHUB_JOB, "shell"),
  ].join(":");
}

function parseMetadata(content) {
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const index = line.indexOf("=");
        return index === -1 ? [line, ""] : [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

function readMetadata(lockDir) {
  try {
    return parseMetadata(readFileSync(path.join(lockDir, "metadata"), "utf8"));
  } catch {
    return {};
  }
}

function describeLock(lockDir) {
  const metadata = readMetadata(lockDir);
  const ageSeconds = Math.max(
    0,
    Math.floor(Date.now() / 1000) -
      parseNonNegativeInt(metadata.created_epoch, Math.floor(Date.now() / 1000)),
  );
  return `owner=${metadata.owner || "unknown"} created_at=${metadata.created_at || "unknown"} age=${ageSeconds}s`;
}

function writeMetadata(lockDir, options) {
  const now = new Date();
  const metadata = {
    schema_version: "rtnn.client-build-lock.v1",
    owner: options.owner,
    name: options.name,
    label: options.label,
    created_epoch: String(Math.floor(now.getTime() / 1000)),
    created_at: now.toISOString(),
    repository: normalizeString(process.env.GITHUB_REPOSITORY),
    workflow: normalizeString(process.env.GITHUB_WORKFLOW),
    run_id: normalizeString(process.env.GITHUB_RUN_ID),
    run_attempt: normalizeString(process.env.GITHUB_RUN_ATTEMPT),
    job: normalizeString(process.env.GITHUB_JOB),
    pid: String(process.pid),
  };

  writeFileSync(
    path.join(lockDir, "metadata"),
    `${Object.entries(metadata)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")}\n`,
  );
}

function acquireLock(options) {
  const lockDir = path.join(options.root, `${sanitizeName(options.name)}.lock`);
  const deadline = Date.now() + options.timeoutSeconds * 1000;

  mkdirSync(options.root, { recursive: true });

  while (true) {
    try {
      mkdirSync(lockDir);
      writeMetadata(lockDir, options);
      console.log(`[client-build-lock] acquired name=${options.name} label=${options.label} owner=${options.owner}`);
      return lockDir;
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw error;
      }
    }

    const metadata = readMetadata(lockDir);
    const createdEpoch = parseNonNegativeInt(
      metadata.created_epoch,
      Math.floor(Date.now() / 1000),
    );
    const ageSeconds = Math.max(0, Math.floor(Date.now() / 1000) - createdEpoch);
    if (options.staleSeconds > 0 && ageSeconds >= options.staleSeconds) {
      console.log(`[client-build-lock] remove stale lock ${describeLock(lockDir)}`);
      rmSync(lockDir, { recursive: true, force: true });
      continue;
    }

    if (Date.now() >= deadline) {
      throw new Error(
        `等待客户端构建资源锁超时: name=${options.name} label=${options.label} ${describeLock(lockDir)}`,
      );
    }

    console.log(`[client-build-lock] waiting name=${options.name} label=${options.label} ${describeLock(lockDir)}`);
    sleep(options.pollSeconds);
  }
}

function releaseLock(lockDir, owner) {
  const metadata = readMetadata(lockDir);
  if (metadata.owner && metadata.owner !== owner) {
    console.log(`[client-build-lock] skip release: lock owner changed to ${metadata.owner}`);
    return;
  }

  rmSync(lockDir, { recursive: true, force: true });
  console.log(`[client-build-lock] released owner=${owner}`);
}

function parseArgs(argv) {
  const args = {
    name: normalizeString(process.env.RTNN_CLIENT_BUILD_LOCK_NAME, "rtnn-server-heavy"),
    root: normalizeString(
      process.env.RTNN_CLIENT_BUILD_LOCK_ROOT,
      path.join(process.cwd(), ".rtnn", "locks"),
    ),
    owner: normalizeString(process.env.RTNN_CLIENT_BUILD_LOCK_OWNER, defaultOwner()),
    label: normalizeString(process.env.RTNN_CLIENT_BUILD_LOCK_LABEL, "client-build"),
    timeoutSeconds: parseNonNegativeInt(
      process.env.RTNN_CLIENT_BUILD_LOCK_TIMEOUT_SECONDS,
      7200,
    ),
    staleSeconds: parseNonNegativeInt(
      process.env.RTNN_CLIENT_BUILD_LOCK_STALE_SECONDS,
      21600,
    ),
    pollSeconds: parseNonNegativeInt(
      process.env.RTNN_CLIENT_BUILD_LOCK_POLL_SECONDS,
      5,
    ),
    command: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];

    switch (item) {
      case "--name":
        args.name = normalizeString(argv[++index], args.name);
        break;
      case "--root":
        args.root = normalizeString(argv[++index], args.root);
        break;
      case "--owner":
        args.owner = normalizeString(argv[++index], args.owner);
        break;
      case "--label":
        args.label = normalizeString(argv[++index], args.label);
        break;
      case "--timeout-seconds":
        args.timeoutSeconds = parseNonNegativeInt(argv[++index], args.timeoutSeconds);
        break;
      case "--stale-seconds":
        args.staleSeconds = parseNonNegativeInt(argv[++index], args.staleSeconds);
        break;
      case "--poll-seconds":
        args.pollSeconds = parseNonNegativeInt(argv[++index], args.pollSeconds);
        break;
      case "--":
        args.command = argv.slice(index + 1);
        return args;
      case "--help":
      case "-h":
        console.log(`用法:
  node scripts/release/with-client-build-lock.mjs [options] -- <command...>

说明:
  仅用于 self-hosted 客户端打包，避免同机多个重型任务并发压垮服务器。`);
        process.exit(0);
      default:
        throw new Error(`未知参数: ${item}`);
    }
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command.length === 0) {
    throw new Error("必须在 -- 后传入要执行的命令");
  }
  if (args.pollSeconds <= 0) {
    throw new Error("--poll-seconds 必须大于 0");
  }

  const lockDir = acquireLock(args);
  const release = () => releaseLock(lockDir, args.owner);
  process.once("SIGINT", () => {
    release();
    process.exit(130);
  });
  process.once("SIGTERM", () => {
    release();
    process.exit(143);
  });

  const result = spawnSync(args.command[0], args.command.slice(1), {
    stdio: "inherit",
    shell: false,
    env: process.env,
  });

  release();

  if (result.error) {
    throw result.error;
  }
  process.exit(result.status ?? 1);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
