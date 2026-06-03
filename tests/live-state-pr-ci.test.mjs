import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { writeReleaseProject } from "./helpers/release-fixtures.mjs";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT_PATH = path.join(
  ROOT_DIR,
  "scripts/release/run-live-state-pr-ci.mjs",
);

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed\n${result.stderr}`);
  }

  return result.stdout.trim();
}

function setupRepository(options = {}) {
  const cwd = mkdtempSync(path.join(tmpdir(), "rtnn-live-state-pr-ci-"));
  run("git", ["init", "--initial-branch=main"], cwd);
  run("git", ["config", "user.email", "agent@example.com"], cwd);
  run("git", ["config", "user.name", "Agent"], cwd);
  writeReleaseProject(cwd, options);
  run("git", ["add", ".env", ".rtnn/project.json"], cwd);
  run("git", ["commit", "-m", "initial"], cwd);
  return cwd;
}

test("liveState PR CI creates a liveState-only commit in no-push mode", () => {
  const cwd = setupRepository({
    activeRelease: "main-old",
    sourceSha: "",
    includeClientState: false,
  });
  try {
    const outputPath = path.join(cwd, "github-output.txt");
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
        "--branch",
        "automation/rtnn-live-state/testing-test",
        "--output-dir",
        "artifacts/live-state-pr",
        "--no-push",
      ],
      {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          GITHUB_OUTPUT: outputPath,
        },
      },
    );

    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.changed, true);
    assert.equal(payload.pushed, false);
    assert.match(payload.commit, /^[0-9a-f]{40}$/);
    assert.match(
      run("git", ["log", "-1", "--pretty=%s"], cwd),
      /sync RTNN liveState/,
    );
    assert.equal(
      run("git", ["diff", "HEAD^", "HEAD", "--name-only"], cwd),
      ".rtnn/project.json",
    );

    const summary = readFileSync(
      path.join(cwd, "artifacts/live-state-pr/live-state-pr.md"),
      "utf8",
    );
    assert.match(summary, /Sync RTNN liveState/);
    assert.match(readFileSync(outputPath, "utf8"), /changed=true/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("liveState PR CI allows release status artifacts from prior CI steps", () => {
  const cwd = setupRepository({
    activeRelease: "main-old",
    sourceSha: "",
    includeClientState: false,
  });
  try {
    mkdirSync(path.join(cwd, "artifacts/release-status"), { recursive: true });
    writeFileSync(
      path.join(cwd, "artifacts/release-status/release-status.json"),
      '{"status":"stale"}\n',
    );
    writeFileSync(
      path.join(cwd, "artifacts/release-status/release-status.md"),
      "status\n",
    );

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
        "--branch",
        "automation/rtnn-live-state/testing-artifacts",
        "--output-dir",
        "artifacts/live-state-pr",
        "--allow-dirty-path",
        "artifacts/release-status",
        "--no-push",
      ],
      {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.changed, true);
    assert.equal(
      run("git", ["diff", "HEAD^", "HEAD", "--name-only"], cwd),
      ".rtnn/project.json",
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("liveState PR CI accepts GH_TOKEN as the workflow token alias", () => {
  const source = readFileSync(SCRIPT_PATH, "utf8");

  assert.match(source, /process\.env\.GITHUB_TOKEN \|\| process\.env\.GH_TOKEN/);
  assert.match(source, /GITHUB_TOKEN 或 GH_TOKEN/);
});

test("liveState PR CI reports no-op when liveState is already fresh", () => {
  const cwd = setupRepository();
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
        "--branch",
        "automation/rtnn-live-state/testing-noop",
        "--no-push",
      ],
      {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.changed, false);
    assert.equal(run("git", ["rev-list", "--count", "HEAD"], cwd), "1");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("liveState PR CI rejects dirty workspaces before branch changes", () => {
  const cwd = setupRepository();
  try {
    writeFileSync(path.join(cwd, "README.md"), "dirty\n");
    const result = spawnSync(
      process.execPath,
      [
        SCRIPT_PATH,
        "--facts-file",
        "runtime-facts.json",
        "--environment",
        "testing",
        "--no-push",
      ],
      {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /需要干净工作区/);
    assert.equal(run("git", ["branch", "--show-current"], cwd), "main");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
