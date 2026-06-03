import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  writeJson,
  writeReleaseProject,
  writeRuntimeFacts,
  writeTemplateEnv,
} from "./helpers/release-fixtures.mjs";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT_PATH = path.join(
  ROOT_DIR,
  "scripts/release/check-production-readiness.mjs",
);

function runGit(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function setupProject(options = {}) {
  const cwd = mkdtempSync(path.join(tmpdir(), "rtnn-production-readiness-"));
  writeReleaseProject(cwd, options);
  runGit(cwd, ["init", "-q"]);
  runGit(cwd, ["config", "user.name", "test"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "-q", "-m", "fixture"]);
  const sourceSha = runGit(cwd, ["rev-parse", "HEAD"]);
  runGit(cwd, ["tag", "v1.2.3"]);
  return { cwd, sourceSha };
}

function runReadiness(cwd, args = []) {
  return spawnSync(
    process.execPath,
    [
      SCRIPT_PATH,
      "--deploy-version",
      "v1.2.3",
      "--json",
      ...args,
    ],
    {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

test("production readiness passes for valid tag and fresh testing facts", () => {
  const { cwd, sourceSha } = setupProject();
  try {
    const result = runReadiness(cwd, [
      "--source-sha",
      sourceSha,
      "--facts-file",
      "runtime-facts.json",
    ]);

    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, true);
    assert.equal(payload.status, "fresh");
    assert.equal(payload.code, "OK");
    assert.equal(payload.checks.version.tagSha, sourceSha);
    assert.equal(payload.checks.testingFreshness.ok, true);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("production readiness can skip optional testing facts", () => {
  const { cwd } = setupProject();
  try {
    const result = runReadiness(cwd);

    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, true);
    assert.equal(payload.checks.testingFreshness.status, "skipped");
    assert.equal(
      payload.checks.testingFreshness.code,
      "PRODUCTION_READINESS_SKIPPED",
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("production readiness ignores leading argument separator", () => {
  const { cwd } = setupProject();
  try {
    const result = runReadiness(cwd, ["--"]);

    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, true);
    assert.equal(payload.deployVersion, "v1.2.3");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("production readiness rejects source sha that does not match tag", () => {
  const { cwd } = setupProject();
  try {
    const result = runReadiness(cwd, [
      "--source-sha",
      "0000000000000000000000000000000000000000",
    ]);

    assert.notEqual(result.status, 0);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false);
    assert.equal(payload.status, "blocked");
    assert.equal(payload.code, "PRODUCTION_READINESS_INVALID");
    assert.match(
      payload.findings.map((item) => item.message).join("\n"),
      /source_sha 与 deploy_version tag 指向提交不一致/,
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("production readiness blocks when testing runtime facts are stale", () => {
  const { cwd } = setupProject({
    activeRelease: "main-old",
    sourceSha: "old",
  });
  try {
    const result = runReadiness(cwd, [
      "--facts-file",
      "runtime-facts.json",
    ]);

    assert.notEqual(result.status, 0);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false);
    assert.equal(payload.status, "blocked");
    assert.equal(payload.checks.testingFreshness.code, "RUNTIME_FACTS_STALE");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("production readiness reports missing business metadata", () => {
  const cwd = mkdtempSync(path.join(tmpdir(), "rtnn-production-readiness-empty-"));
  try {
    writeTemplateEnv(cwd);
    writeRuntimeFacts(cwd);
    runGit(cwd, ["init", "-q"]);
    runGit(cwd, ["config", "user.name", "test"]);
    runGit(cwd, ["config", "user.email", "test@example.com"]);
    writeJson(path.join(cwd, "fixture.json"), { ok: true });
    runGit(cwd, ["add", "."]);
    runGit(cwd, ["commit", "-q", "-m", "fixture"]);
    runGit(cwd, ["tag", "v1.2.3"]);

    const result = runReadiness(cwd);
    assert.notEqual(result.status, 0);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false);
    assert.equal(payload.checks.metadata.code, "INVALID_PROJECT_METADATA");
    assert.match(payload.checks.metadata.error, /缺少项目事实文件/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
