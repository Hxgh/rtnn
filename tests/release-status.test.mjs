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
  writeReleaseProject,
  writeRuntimeFacts,
  writeTemplateEnv,
} from "./helpers/release-fixtures.mjs";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT_PATH = path.join(
  ROOT_DIR,
  "scripts/release/check-release-status.mjs",
);

function setupProject({
  activeRelease = "main-abc123",
  sourceSha = "abc123",
  includeClientState = true,
  includeMetadata = true,
} = {}) {
  const cwd = mkdtempSync(path.join(tmpdir(), "rtnn-release-status-"));

  if (includeMetadata) {
    writeReleaseProject(cwd, {
      activeRelease,
      sourceSha,
      includeClientState,
    });
  } else {
    writeTemplateEnv(cwd);
    writeRuntimeFacts(cwd);
  }

  return cwd;
}

function run(cwd, args = []) {
  return spawnSync(
    process.execPath,
    [
      SCRIPT_PATH,
      "--facts-file",
      "runtime-facts.json",
      "--environment",
      "testing",
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

test("release status passes when runtime and client liveState are fresh", () => {
  const cwd = setupProject();
  try {
    const result = run(cwd, [
      "--client-artifacts-dir",
      "artifacts/client-release",
    ]);

    assert.equal(result.status, 0, result.stderr);

    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, true);
    assert.equal(payload.status, "fresh");
    assert.equal(payload.code, "OK");
    assert.equal(payload.checks.profile.ok, true);
    assert.equal(payload.checks.runtime.ok, true);
    assert.equal(payload.checks.clientLiveState.ok, true);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("release status fails when runtime liveState is stale", () => {
  const cwd = setupProject({
    activeRelease: "main-old",
    sourceSha: "old",
  });
  try {
    const result = run(cwd);

    assert.notEqual(result.status, 0);

    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false);
    assert.equal(payload.status, "stale");
    assert.equal(payload.checks.runtime.ok, false);
    assert.equal(payload.checks.runtime.code, "RUNTIME_FACTS_STALE");
    assert.equal(
      payload.checks.runtime.environments[0].mismatches[0].field,
      "activeRelease",
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("release status fails when client liveState differs from artifacts", () => {
  const cwd = setupProject({
    includeClientState: false,
  });
  try {
    const result = run(cwd, [
      "--client-artifacts-dir",
      "artifacts/client-release",
    ]);

    assert.notEqual(result.status, 0);

    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false);
    assert.equal(payload.status, "stale");
    assert.equal(payload.checks.runtime.ok, true);
    assert.equal(payload.checks.clientLiveState.ok, false);
    assert.equal(payload.checks.clientLiveState.code, "CLIENT_LIVE_STATE_STALE");
    assert.equal(
      payload.checks.clientLiveState.environments[0].changeCount,
      1,
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("release status checks deploy client facts without runtime facts", () => {
  const cwd = setupProject({
    includeClientState: false,
  });
  try {
    const result = spawnSync(
      process.execPath,
      [
        SCRIPT_PATH,
        "--skip-runtime",
        "--client-facts-file",
        "client-facts.json",
        "--environment",
        "testing",
        "--json",
      ],
      {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    assert.notEqual(result.status, 0);

    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false);
    assert.equal(payload.status, "stale");
    assert.equal(payload.checks.runtime.status, "skipped");
    assert.equal(payload.checks.clientLiveState.ok, false);
    assert.equal(payload.checks.clientLiveState.code, "CLIENT_LIVE_STATE_STALE");
    assert.equal(
      payload.checks.clientLiveState.environments[0].changeCount,
      1,
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("release status reports missing project metadata clearly", () => {
  const cwd = setupProject({
    includeMetadata: false,
  });
  try {
    const result = run(cwd);

    assert.notEqual(result.status, 0);

    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false);
    assert.equal(payload.checks.profile.ok, true);
    assert.equal(payload.checks.runtime.ok, false);
    assert.equal(payload.checks.runtime.code, "MISSING_PROJECT_METADATA");
    assert.match(payload.checks.runtime.error, /缺少项目事实文件/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("release status writes JSON output and markdown summary", () => {
  const cwd = setupProject();
  try {
    const result = spawnSync(
      process.execPath,
      [
        SCRIPT_PATH,
        "--facts-file",
        "runtime-facts.json",
        "--environment",
        "testing",
        "--client-artifacts-dir",
        "artifacts/client-release",
        "--summary-md",
        "--output",
        "status/release-status.json",
      ],
      {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /RTNN Release Status/);
    assert.match(result.stdout, /Conclusion:\*\* fresh/);

    const output = JSON.parse(
      readFileSync(path.join(cwd, "status/release-status.json"), "utf8"),
    );
    assert.equal(output.status, "fresh");
    assert.equal(output.code, "OK");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
