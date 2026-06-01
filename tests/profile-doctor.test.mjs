import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const SCRIPT_PATH = path.join(ROOT_DIR, "scripts/template/profile-doctor.mjs");

function withTempDir(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-profile-doctor-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function writeProjectMetadata(rootDir, value) {
  mkdirSync(path.join(rootDir, ".rtnn"), { recursive: true });
  writeFileSync(
    path.join(rootDir, ".rtnn/project.json"),
    `${JSON.stringify(value, null, 2)}\n`,
  );
}

function run(rootDir, args = []) {
  return spawnSync(
    process.execPath,
    [SCRIPT_PATH, "--root", rootDir, ...args],
    {
      cwd: ROOT_DIR,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

test("profile doctor reports template default profile without metadata", () => {
  withTempDir((rootDir) => {
    const result = run(rootDir, ["--json"]);
    assert.equal(result.status, 0, result.stderr);

    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, true);
    assert.equal(payload.profile.source, "template-default");
    assert.deepEqual(payload.profile.enabledServices, [
      "backend",
      "admin",
      "app",
      "weapp",
    ]);
    assert.equal(payload.findings[0].code, "template-default-profile");
  });
});

test("profile doctor flags business source without explicit delivery in strict mode", () => {
  withTempDir((rootDir) => {
    writeProjectMetadata(rootDir, {
      project: {
        role: "business-source",
        projectId: "acme",
      },
    });

    const result = run(rootDir, ["--json", "--strict"]);
    assert.notEqual(result.status, 0);

    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false);
    assert.equal(payload.summary.warnCount, 1);
    assert.equal(payload.findings[0].code, "delivery-not-configured");
  });
});

test("profile doctor reports disabled client build targets", () => {
  withTempDir((rootDir) => {
    writeProjectMetadata(rootDir, {
      project: {
        role: "business-source",
        projectId: "acme",
      },
      delivery: {
        clients: {
          appMobile: {
            enabled: true,
            targets: ["android"],
          },
        },
      },
    });

    const result = run(rootDir, ["--json"]);
    assert.equal(result.status, 0, result.stderr);

    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, true);
    assert.ok(
      payload.findings.some(
        (item) => item.code === "client-build-targets-disabled",
      ),
    );
  });
});
