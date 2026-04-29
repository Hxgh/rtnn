import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildBusinessProjectMetadata } from "../scripts/lib/project-metadata.mjs";
import {
  buildProjectProfile,
  resolveProjectProfile,
} from "../scripts/lib/project-profile.mjs";

function withTempDir(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-profile-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function parseOutput(stdout) {
  return Object.fromEntries(
    stdout
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
      }),
  );
}

test("resolveProjectProfile returns template full service profile without metadata", () => {
  withTempDir((rootDir) => {
    const profile = resolveProjectProfile(rootDir);

    assert.equal(profile.source, "template-default");
    assert.deepEqual(profile.enabledServices, [
      "backend",
      "admin",
      "app",
      "weapp",
    ]);
    assert.deepEqual(profile.enabledClients, []);
    assert.deepEqual(profile.enabledClientBuildTargets, []);
  });
});

test("buildProjectProfile keeps current service compatibility without delivery config", () => {
  const profile = buildProjectProfile({
    project: {
      role: "business-source",
    },
  });

  assert.equal(profile.source, "project-metadata");
  assert.equal(profile.isBusinessSource, true);
  assert.equal(profile.deliveryConfigured, false);
  assert.deepEqual(profile.enabledServices, [
    "backend",
    "admin",
    "app",
    "weapp",
  ]);
  assert.deepEqual(profile.enabledClients, []);
});

test("buildProjectProfile disables optional services and expands client targets", () => {
  const profile = buildProjectProfile({
    project: {
      role: "business-source",
    },
    delivery: {
      services: {
        app: { enabled: false },
        weapp: { enabled: false },
      },
      clients: {
        adminDesktop: {
          enabled: true,
          targets: ["macos"],
          webUrl: "https://admin.example.com",
          webUrls: {
            testing: "https://admin.testing.example.com",
            production: "https://admin.example.com",
          },
          channel: "testing",
        },
      },
    },
  });

  assert.deepEqual(profile.enabledServices, ["backend", "admin"]);
  assert.deepEqual(profile.disabledServices, ["app", "weapp"]);
  assert.equal(
    profile.disabledReasons.services.app,
    "delivery.services.enabled=false",
  );
  assert.deepEqual(profile.enabledClients, ["adminDesktop"]);
  assert.deepEqual(profile.enabledClientBuildTargets, [
    { client: "adminDesktop", target: "macos" },
  ]);
  assert.equal(profile.clients.adminDesktop.webUrl, "https://admin.example.com");
  assert.deepEqual(profile.clients.adminDesktop.webUrls, {
    testing: "https://admin.testing.example.com",
    production: "https://admin.example.com",
  });
  assert.equal(profile.clients.adminDesktop.channel, "testing");
});

test("buildProjectProfile keeps backend enabled as the contract source", () => {
  const profile = buildProjectProfile({
    delivery: {
      services: {
        backend: { enabled: false },
      },
    },
  });

  assert.equal(profile.services.backend.enabled, true);
  assert.equal(profile.services.backend.reason, "backend-required");
  assert.equal(profile.disabledReasons.services.backend, undefined);
  assert.equal(profile.warnings.length, 1);
});

test("buildBusinessProjectMetadata preserves existing delivery configuration", () => {
  withTempDir((rootDir) => {
    const metadata = buildBusinessProjectMetadata(rootDir, {
      delivery: {
        services: {
          app: { enabled: false },
        },
      },
    });

    assert.deepEqual(metadata.delivery, {
      services: {
        app: { enabled: false },
      },
    });
  });
});

test("resolve-release-context emits enabled service matrix from delivery profile", () => {
  withTempDir((rootDir) => {
    mkdirSync(path.join(rootDir, ".rtnn"), { recursive: true });
    writeFileSync(
      path.join(rootDir, ".rtnn/project.json"),
      `${JSON.stringify(
        {
          project: {
            role: "business-source",
            projectId: "acme",
          },
          deployment: {
            application: "acme",
            imageNamePrefix: "acme",
            dispatchEventType: "promote-acme",
          },
          delivery: {
            services: {
              app: { enabled: false },
              weapp: { enabled: false },
            },
          },
        },
        null,
        2,
      )}\n`,
    );

    const repoRoot = fileURLToPath(new URL("..", import.meta.url));
    const scriptPath = path.join(
      repoRoot,
      "scripts/release/resolve-release-context.mjs",
    );
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: rootDir,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_REF: "refs/heads/main",
        GITHUB_REF_NAME: "main",
        GITHUB_SHA: "1234567890abcdef",
      },
    });

    assert.equal(result.status, 0, result.stderr);

    const output = parseOutput(result.stdout);
    assert.equal(output.enabled, "true");
    assert.equal(output.version, "main-1234567890ab");
    assert.deepEqual(JSON.parse(output.service_matrix), {
      service: ["backend", "admin"],
    });
    assert.deepEqual(JSON.parse(output.enabled_services_json), [
      "backend",
      "admin",
    ]);
  });
});
