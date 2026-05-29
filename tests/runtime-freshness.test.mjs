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

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT_PATH = path.join(
  ROOT_DIR,
  "scripts/release/check-runtime-freshness.mjs",
);

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function setupProject({ activeRelease = "main-abc123", sourceSha = "abc123" } = {}) {
  const cwd = mkdtempSync(path.join(tmpdir(), "rtnn-runtime-freshness-"));

  writeFileSync(
    path.join(cwd, ".env"),
    [
      "TEMPLATE_PROJECT_ID=acme",
      "TEMPLATE_BRAND_NAME=ACME",
      "TEMPLATE_COOKIE_PREFIX=acme",
      "TEMPLATE_IMAGE_NAME_PREFIX=acme",
      "TEMPLATE_DEPLOY_APPLICATION=acme",
      "TEMPLATE_DEPLOY_EVENT_TYPE=promote-acme",
      "",
    ].join("\n"),
  );
  writeJson(path.join(cwd, ".rtnn/project.json"), {
    version: "v1",
    project: {
      repo: "acme/business-source",
      role: "business-source",
      projectId: "acme",
      brandName: "ACME",
      cookiePrefix: "acme",
    },
    upstreamTemplate: {
      repo: "acme/rtnn",
      remote: "upstream",
      defaultRef: "main",
      syncStrategy: "git-merge-from-upstream",
    },
    deployment: {
      repo: "acme/rtnn-deploy",
      application: "acme",
      imageNamePrefix: "acme",
      dispatchEventType: "promote-acme",
      environments: ["testing", "production"],
    },
    domains: {
      testing: {},
      production: {},
    },
    server: {
      hostModel: "single-host",
    },
    releaseExecution: {
      defaultMode: "github-hosted",
      allowedModes: ["github-hosted", "server-local"],
    },
    liveState: {
      testing: {
        activeRelease,
        sourceSha,
      },
      production: {},
    },
  });
  writeJson(path.join(cwd, "runtime-facts.json"), buildFacts());

  return cwd;
}

function buildFacts(overrides = {}) {
  return {
    schemaVersion: "rtnn.deploy.runtime-facts.v1",
    binding: {
      sourceRepository: "acme/business-source",
      application: "acme",
      imageNamePrefix: "acme",
      dispatchEventType: "promote-acme",
    },
    environments: [
      {
        environment: "testing",
        source: {
          exists: true,
        },
        release: {
          deployVersion: "main-abc123",
          sourceSha: "abc123",
        },
        health: {
          results: {
            version: {
              ok: true,
              body: {
                version: "main-abc123",
                sourceSha: "abc123",
              },
            },
            readyz: {
              ok: true,
            },
            healthz: {
              ok: true,
            },
          },
        },
        ...overrides,
      },
    ],
  };
}

function run(cwd, args = []) {
  return spawnSync(process.execPath, [SCRIPT_PATH, "--facts-file", "runtime-facts.json", ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

test("runtime freshness passes when liveState matches runtime facts", () => {
  const cwd = setupProject();
  try {
    const result = run(cwd, ["--environment", "testing", "--json"]);
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, true);
    assert.equal(payload.environments[0].fresh, true);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("runtime freshness fails when liveState is stale", () => {
  const cwd = setupProject({ activeRelease: "main-old", sourceSha: "old" });
  try {
    const result = run(cwd, ["--environment", "testing", "--json"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /线上运行事实与 liveState 不一致/);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false);
    assert.equal(payload.environments[0].fresh, false);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("runtime freshness rejects sensitive runtime facts", () => {
  const cwd = setupProject();
  try {
    const facts = buildFacts({
      databaseUrl: "postgres://secret@example.invalid/db",
    });
    writeJson(path.join(cwd, "runtime-facts.json"), facts);

    const result = run(cwd, ["--environment", "testing"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /疑似敏感字段/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("runtime freshness CLI ignores leading argument separator", () => {
  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--", "--help"], {
    cwd: ROOT_DIR,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /runtime facts/);
});
