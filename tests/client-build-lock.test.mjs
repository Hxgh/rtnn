import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");
const lockScript = path.join(repoRoot, "scripts/release/with-client-build-lock.mjs");

function withTempDir(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-client-build-lock-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function runLock(args, options = {}) {
  return spawnSync("node", [lockScript, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    shell: false,
    env: {
      ...process.env,
      ...options.env,
    },
  });
}

test("client build lock releases after successful command", () => {
  withTempDir((rootDir) => {
    const result = runLock([
      "--name",
      "android",
      "--root",
      rootDir,
      "--owner",
      "test-owner",
      "--",
      "node",
      "-e",
      "process.exit(0)",
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(path.join(rootDir, "android.lock")), false);
  });
});

test("client build lock releases after failed command and preserves status", () => {
  withTempDir((rootDir) => {
    const result = runLock([
      "--name",
      "android",
      "--root",
      rootDir,
      "--owner",
      "test-owner",
      "--",
      "node",
      "-e",
      "process.exit(7)",
    ]);

    assert.equal(result.status, 7, result.stderr || result.stdout);
    assert.equal(existsSync(path.join(rootDir, "android.lock")), false);
  });
});

test("client build lock removes stale lock before running command", () => {
  withTempDir((rootDir) => {
    const staleLock = path.join(rootDir, "android.lock");
    mkdirSync(staleLock);
    writeFileSync(
      path.join(staleLock, "metadata"),
      "owner=stale-owner\ncreated_epoch=1\ncreated_at=1970-01-01T00:00:01.000Z\n",
    );

    const result = runLock([
      "--name",
      "android",
      "--root",
      rootDir,
      "--owner",
      "test-owner",
      "--stale-seconds",
      "1",
      "--",
      "node",
      "-e",
      "process.exit(0)",
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /remove stale lock/);
    assert.equal(existsSync(staleLock), false);
  });
});

test("client build lock fails when active lock cannot be acquired", () => {
  withTempDir((rootDir) => {
    const activeLock = path.join(rootDir, "android.lock");
    mkdirSync(activeLock);
    writeFileSync(
      path.join(activeLock, "metadata"),
      `owner=active-owner\ncreated_epoch=${Math.floor(Date.now() / 1000)}\ncreated_at=now\n`,
    );

    const result = runLock([
      "--name",
      "android",
      "--root",
      rootDir,
      "--owner",
      "test-owner",
      "--timeout-seconds",
      "0",
      "--",
      "node",
      "-e",
      "process.exit(0)",
    ]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /等待客户端构建资源锁超时/);
    assert.equal(existsSync(activeLock), true);
  });
});
