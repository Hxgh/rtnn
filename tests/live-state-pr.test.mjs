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
  "scripts/release/prepare-live-state-pr.mjs",
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

function setupRepository() {
  const cwd = mkdtempSync(path.join(tmpdir(), "rtnn-live-state-pr-"));
  run("git", ["init"], cwd);
  run("git", ["config", "user.email", "agent@example.com"], cwd);
  run("git", ["config", "user.name", "Agent"], cwd);

  writeReleaseProject(cwd, {
    activeRelease: "main-old",
    sourceSha: "",
    includeClientState: false,
  });

  run("git", ["add", ".env", ".rtnn/project.json"], cwd);
  run("git", ["commit", "-m", "initial"], cwd);
  return cwd;
}

test("prepare-live-state-pr writes only project liveState and PR summary", () => {
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
        "--summary-md",
        "tmp/live-state-pr.md",
        "--allow-dirty-path",
        "client-facts.json",
        "--json",
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
    assert.equal(payload.runtimeChanges[0].environment, "testing");
    assert.equal(payload.clientChanges[0].environment, "testing");

    const changedFiles = run("git", ["diff", "--name-only"], cwd)
      .split(/\r?\n/)
      .filter(Boolean);
    assert.deepEqual(changedFiles, [".rtnn/project.json"]);

    const metadata = JSON.parse(
      readFileSync(path.join(cwd, ".rtnn/project.json"), "utf8"),
    );
    assert.equal(metadata.liveState.testing.activeRelease, "main-abc123");
    assert.equal(metadata.liveState.testing.sourceSha, "abc123");
    assert.equal(
      metadata.liveState.testing.clients.adminDesktop.macos.releaseVersion,
      "1.2.3",
    );
    assert.match(
      readFileSync(path.join(cwd, "tmp/live-state-pr.md"), "utf8"),
      /Sync RTNN liveState/,
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("prepare-live-state-pr accepts deploy client facts without runtime facts", () => {
  const cwd = setupRepository();
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
        "--summary-md",
        "tmp/client-live-state-pr.md",
        "--allow-dirty-path",
        "runtime-facts.json",
        "--allow-dirty-path",
        "artifacts/client-release",
        "--json",
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
    assert.deepEqual(payload.runtimeChanges, []);
    assert.equal(payload.clientChanges[0].environment, "testing");

    const changedFiles = run("git", ["diff", "--name-only"], cwd)
      .split(/\r?\n/)
      .filter(Boolean);
    assert.deepEqual(changedFiles, [".rtnn/project.json"]);

    const metadata = JSON.parse(
      readFileSync(path.join(cwd, ".rtnn/project.json"), "utf8"),
    );
    assert.equal(metadata.liveState.testing.activeRelease, "main-old");
    assert.equal(
      metadata.liveState.testing.clients.adminDesktop.macos.releaseVersion,
      "1.2.3",
    );
    assert.match(
      readFileSync(path.join(cwd, "tmp/client-live-state-pr.md"), "utf8"),
      /No runtime liveState changes/,
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("prepare-live-state-pr rejects unrelated dirty files", () => {
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
      ],
      {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /只允许修改 \.rtnn\/project\.json/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("prepare-live-state-pr rejects summary paths outside generated dirs", () => {
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
        "--summary-md",
        "README.md",
      ],
      {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /只能使用临时\/产物目录/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("prepare-live-state-pr rejects tracked summary files", () => {
  const cwd = setupRepository();
  try {
    mkdirSync(path.join(cwd, "tmp"), { recursive: true });
    writeFileSync(path.join(cwd, "tmp/live-state-pr.md"), "tracked\n");
    run("git", ["add", "tmp/live-state-pr.md"], cwd);
    run("git", ["commit", "-m", "tracked summary"], cwd);

    const result = spawnSync(
      process.execPath,
      [
        SCRIPT_PATH,
        "--facts-file",
        "runtime-facts.json",
        "--environment",
        "testing",
        "--summary-md",
        "tmp/live-state-pr.md",
      ],
      {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /不能覆盖 git 已跟踪文件/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
