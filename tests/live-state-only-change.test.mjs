import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT_PATH = path.join(
  ROOT_DIR,
  "scripts/release/detect-live-state-only-change.mjs",
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

function writeProjectMetadata(cwd, metadata) {
  mkdirSync(path.join(cwd, ".rtnn"), { recursive: true });
  writeFileSync(
    path.join(cwd, ".rtnn/project.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
}

function setupRepository() {
  const cwd = mkdtempSync(path.join(tmpdir(), "rtnn-live-state-only-"));
  run("git", ["init"], cwd);
  run("git", ["config", "user.email", "agent@example.com"], cwd);
  run("git", ["config", "user.name", "Agent"], cwd);
  writeProjectMetadata(cwd, {
    version: "v1",
    project: {
      repo: "Hxgh/example",
      role: "business-source",
      projectId: "example",
      brandName: "Example",
      cookiePrefix: "example",
    },
    deployment: {
      repo: "Hxgh/example-deploy",
      application: "example",
      imageNamePrefix: "example",
      dispatchEventType: "promote-example",
      environments: ["testing", "production"],
    },
    liveState: {
      testing: {
        activeRelease: "main-old",
      },
    },
  });
  run("git", ["add", ".rtnn/project.json"], cwd);
  run("git", ["commit", "-m", "initial"], cwd);
  return cwd;
}

function detect(cwd, base = "HEAD~1", head = "HEAD") {
  return JSON.parse(
    run(process.execPath, [SCRIPT_PATH, "--base", base, "--head", head, "--json"], cwd),
  );
}

test("detects project liveState-only changes", () => {
  const cwd = setupRepository();
  writeProjectMetadata(cwd, {
    version: "v1",
    project: {
      repo: "Hxgh/example",
      role: "business-source",
      projectId: "example",
      brandName: "Example",
      cookiePrefix: "example",
    },
    deployment: {
      repo: "Hxgh/example-deploy",
      application: "example",
      imageNamePrefix: "example",
      dispatchEventType: "promote-example",
      environments: ["testing", "production"],
    },
    liveState: {
      testing: {
        activeRelease: "main-new",
        sourceSha: "abc123",
      },
    },
  });
  run("git", ["add", ".rtnn/project.json"], cwd);
  run("git", ["commit", "-m", "sync live state"], cwd);

  const result = detect(cwd);
  assert.equal(result.liveStateOnly, true);
  assert.equal(result.reason, "project-live-state-only");
});

test("does not skip project metadata contract changes", () => {
  const cwd = setupRepository();
  writeProjectMetadata(cwd, {
    version: "v1",
    project: {
      repo: "Hxgh/example",
      role: "business-source",
      projectId: "example",
      brandName: "Example",
      cookiePrefix: "example",
    },
    deployment: {
      repo: "Hxgh/example-deploy",
      application: "example",
      imageNamePrefix: "example-v2",
      dispatchEventType: "promote-example",
      environments: ["testing", "production"],
    },
    liveState: {
      testing: {
        activeRelease: "main-new",
      },
    },
  });
  run("git", ["add", ".rtnn/project.json"], cwd);
  run("git", ["commit", "-m", "change delivery contract"], cwd);

  const result = detect(cwd);
  assert.equal(result.liveStateOnly, false);
  assert.equal(result.reason, "project-metadata-contract-changed");
});

test("does not skip when additional files changed", () => {
  const cwd = setupRepository();
  writeProjectMetadata(cwd, {
    version: "v1",
    project: {
      repo: "Hxgh/example",
      role: "business-source",
      projectId: "example",
      brandName: "Example",
      cookiePrefix: "example",
    },
    deployment: {
      repo: "Hxgh/example-deploy",
      application: "example",
      imageNamePrefix: "example",
      dispatchEventType: "promote-example",
      environments: ["testing", "production"],
    },
    liveState: {
      testing: {
        activeRelease: "main-new",
      },
    },
  });
  writeFileSync(path.join(cwd, "package.json"), '{"name":"example"}\n');
  run("git", ["add", ".rtnn/project.json", "package.json"], cwd);
  run("git", ["commit", "-m", "change code and live state"], cwd);

  const result = detect(cwd);
  assert.equal(result.liveStateOnly, false);
  assert.equal(result.reason, "changed-files-not-live-state-only");
});
