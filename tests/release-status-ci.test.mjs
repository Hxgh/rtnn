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
import { writeReleaseProject } from "./helpers/release-fixtures.mjs";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT_PATH = path.join(
  ROOT_DIR,
  "scripts/release/run-release-status-ci.mjs",
);

test("release status CI writes JSON, Markdown and GitHub outputs", () => {
  const cwd = mkdtempSync(path.join(tmpdir(), "rtnn-release-status-ci-"));
  try {
    writeReleaseProject(cwd);
    const outputPath = path.join(cwd, "github-output.txt");
    const summaryPath = path.join(cwd, "github-summary.md");
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
        "--output-dir",
        "artifacts/release-status",
      ],
      {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          GITHUB_OUTPUT: outputPath,
          GITHUB_STEP_SUMMARY: summaryPath,
        },
      },
    );

    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, "fresh");
    assert.equal(payload.code, "OK");

    const output = readFileSync(outputPath, "utf8");
    assert.match(output, /ok=true/);
    assert.match(output, /status=fresh/);
    assert.match(output, /code=OK/);

    const markdown = readFileSync(
      path.join(cwd, "artifacts/release-status/release-status.md"),
      "utf8",
    );
    assert.match(markdown, /RTNN Release Status/);
    assert.match(markdown, /Conclusion:\*\* fresh/);
    assert.match(readFileSync(summaryPath, "utf8"), /RTNN Release Status/);

    const json = JSON.parse(
      readFileSync(
        path.join(cwd, "artifacts/release-status/release-status.json"),
        "utf8",
      ),
    );
    assert.equal(json.status, "fresh");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("release status CI preserves stale result artifacts and outputs", () => {
  const cwd = mkdtempSync(path.join(tmpdir(), "rtnn-release-status-ci-"));
  try {
    writeReleaseProject(cwd, {
      activeRelease: "main-old",
      sourceSha: "old",
    });
    const result = spawnSync(
      process.execPath,
      [
        SCRIPT_PATH,
        "--facts-file",
        "runtime-facts.json",
        "--environment",
        "testing",
        "--output-dir",
        "artifacts/release-status",
      ],
      {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          GITHUB_OUTPUT: path.join(cwd, "github-output.txt"),
        },
      },
    );

    assert.notEqual(result.status, 0);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, "stale");
    assert.equal(payload.code, "RUNTIME_FACTS_STALE");
    const markdown = readFileSync(
      path.join(cwd, "artifacts/release-status/release-status.md"),
      "utf8",
    );
    assert.match(markdown, /RUNTIME_FACTS_STALE/);
    const output = readFileSync(path.join(cwd, "github-output.txt"), "utf8");
    assert.match(output, /ok=false/);
    assert.match(output, /status=stale/);
    assert.match(output, /code=RUNTIME_FACTS_STALE/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("release status CI supports deploy client facts without runtime facts", () => {
  const cwd = mkdtempSync(path.join(tmpdir(), "rtnn-release-status-ci-"));
  try {
    writeReleaseProject(cwd, {
      includeClientState: false,
    });
    const result = spawnSync(
      process.execPath,
      [
        SCRIPT_PATH,
        "--skip-runtime",
        "--client-facts-file",
        "client-facts.json",
        "--environment",
        "testing",
        "--output-dir",
        "artifacts/release-status",
      ],
      {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    assert.notEqual(result.status, 0);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, "stale");
    assert.equal(payload.code, "CLIENT_LIVE_STATE_STALE");

    const json = JSON.parse(
      readFileSync(
        path.join(cwd, "artifacts/release-status/release-status.json"),
        "utf8",
      ),
    );
    assert.equal(json.checks.runtime.status, "skipped");
    assert.equal(json.checks.clientLiveState.factsFile, "client-facts.json");

    const markdown = readFileSync(
      path.join(cwd, "artifacts/release-status/release-status.md"),
      "utf8",
    );
    assert.match(markdown, /CLIENT_LIVE_STATE_STALE/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
