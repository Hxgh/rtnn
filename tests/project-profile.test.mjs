import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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

function childProcessEnv(overrides = {}) {
  const env = {
    ...process.env,
    ...overrides,
  };
  delete env.GITHUB_OUTPUT;
  return env;
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
    assert.equal(profile.releaseExecution.effectiveMode, "server-local");
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

test("buildProjectProfile disables optional services and keeps hosted client targets behind opt-in", () => {
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
        appMobile: {
          enabled: true,
          targets: ["android", "ios"],
          webUrl: "https://app.example.com",
          webUrls: {
            testing: "https://app.testing.example.com",
            production: "https://app.example.com",
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
  assert.deepEqual(profile.enabledClients, ["appMobile"]);
  assert.deepEqual(profile.enabledClientBuildTargets, []);
  assert.equal(
    profile.disabledReasons.clientTargets["appMobile:android"],
    "github-hosted-requires-explicit-opt-in",
  );
  assert.equal(
    profile.disabledReasons.clientTargets["appMobile:ios"],
    "releaseExecution.clientBuild.targets.enabled=false",
  );

  const githubHostedProfile = buildProjectProfile(
    {
      project: {
        role: "business-source",
      },
      delivery: {
        services: {
          app: { enabled: false },
          weapp: { enabled: false },
        },
        clients: {
          appMobile: {
            enabled: true,
            targets: ["android", "ios"],
            webUrl: "https://app.example.com",
            webUrls: {
              testing: "https://app.testing.example.com",
              production: "https://app.example.com",
            },
            channel: "testing",
          },
        },
      },
    },
    {
      releaseExecutionMode: "github-hosted",
      allowGithubHosted: true,
    },
  );

  assert.deepEqual(githubHostedProfile.enabledClientBuildTargets, [
    {
      client: "appMobile",
      target: "android",
      executionMode: "github-hosted",
      runner: "ubuntu-latest",
      runnerKind: "github-hosted",
    },
  ]);
  assert.equal(githubHostedProfile.clients.appMobile.webUrl, "https://app.example.com");
  assert.deepEqual(githubHostedProfile.clients.appMobile.webUrls, {
    testing: "https://app.testing.example.com",
    production: "https://app.example.com",
  });
  assert.equal(githubHostedProfile.clients.appMobile.channel, "testing");
});

test("buildProjectProfile allows server-local Android builds only when configured or requested", () => {
  const metadata = {
    project: {
      role: "business-source",
    },
    releaseExecution: {
      defaultMode: "server-local",
      allowedModes: ["server-local", "github-hosted"],
      clientBuild: {
        targets: {
          android: {
            enabled: true,
            defaultMode: "server-local",
          },
        },
      },
    },
    delivery: {
      clients: {
        appMobile: {
          enabled: true,
          targets: ["android"],
        },
      },
    },
  };

  const profile = buildProjectProfile(metadata);

  assert.deepEqual(profile.enabledClientBuildTargets, [
    {
      client: "appMobile",
      target: "android",
      executionMode: "server-local",
      runner: "self-hosted",
      runnerKind: "self-hosted",
    },
  ]);
});

test("buildProjectProfile requires explicit opt-in for GitHub-hosted client targets", () => {
  const metadata = {
    project: {
      role: "business-source",
    },
    delivery: {
      clients: {
        adminDesktop: {
          enabled: true,
          targets: ["macos", "windows"],
        },
      },
    },
  };

  const defaultProfile = buildProjectProfile(metadata);
  assert.deepEqual(defaultProfile.enabledClientBuildTargets, []);
  assert.equal(
    defaultProfile.disabledReasons.clientTargets["adminDesktop:macos"],
    "releaseExecution.clientBuild.targets.enabled=false",
  );

  const githubHostedProfile = buildProjectProfile(metadata, {
    releaseExecutionMode: "github-hosted",
    allowGithubHosted: true,
    requestedClientTargets: "adminDesktop:macos,adminDesktop:windows",
  });

  assert.equal(
    githubHostedProfile.releaseExecution.effectiveMode,
    "github-hosted",
  );
  assert.deepEqual(githubHostedProfile.enabledClientBuildTargets, [
    {
      client: "adminDesktop",
      target: "macos",
      executionMode: "github-hosted",
      runner: "macos-latest",
      runnerKind: "github-hosted",
    },
    {
      client: "adminDesktop",
      target: "windows",
      executionMode: "github-hosted",
      runner: "windows-latest",
      runnerKind: "github-hosted",
    },
  ]);
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
    assert.equal(metadata.releaseExecution.defaultMode, "server-local");
    assert.equal(metadata.releaseExecution.githubHosted.enabled, false);
    assert.deepEqual(metadata.releaseExecution.clientBuild.targets.android, {
      enabled: true,
      defaultMode: "github-hosted",
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
      env: childProcessEnv({
        GITHUB_REF: "refs/heads/main",
        GITHUB_REF_NAME: "main",
        GITHUB_SHA: "1234567890abcdef",
      }),
    });

    assert.equal(result.status, 0, result.stderr);

    const output = parseOutput(result.stdout);
    assert.equal(output.enabled, "true");
    assert.equal(output.release_execution_mode, "server-local");
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

test("resolve-release-context supports explicit GitHub-hosted mode", () => {
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
      env: childProcessEnv({
        RTNN_RELEASE_EXECUTION_MODE: "github-hosted",
        GITHUB_REF: "refs/heads/main",
        GITHUB_REF_NAME: "main",
        GITHUB_SHA: "1234567890abcdef",
      }),
    });

    assert.equal(result.status, 0, result.stderr);

    const output = parseOutput(result.stdout);
    assert.equal(output.release_execution_mode, "github-hosted");
  });
});

test("release workflows keep server-local outside GHCR image build path", () => {
  const repoRoot = fileURLToPath(new URL("..", import.meta.url));
  const ciCheck = readFileSync(
    path.join(repoRoot, ".github/workflows/ci-check.yml"),
    "utf8",
  );
  const releaseImages = readFileSync(
    path.join(repoRoot, ".github/workflows/release-images.yml"),
    "utf8",
  );
  const promoteProduction = readFileSync(
    path.join(repoRoot, ".github/workflows/promote-production.yml"),
    "utf8",
  );

  assert.match(
    releaseImages,
    /release_execution_mode == 'github-hosted'[\s\S]*Build And Push/,
  );
  assert.match(ciCheck, /PR_BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
  assert.match(ciCheck, /PR_HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(ciCheck, /EVENT_NAME}" == "pull_request"[\s\S]*base_sha="\$\{PR_BASE_SHA\}"/);
  assert.match(ciCheck, /head_sha="\$\{PR_HEAD_SHA\}"/);
  assert.doesNotMatch(ciCheck, /reason=not-main-push/);
  for (const jobName of ["detect-live-state-only", "skip-live-state-only"]) {
    assert.match(
      ciCheck,
      new RegExp(`${jobName}:[\\s\\S]*?runs-on: ubuntu-latest`),
    );
  }
  for (const jobName of [
    "detect-live-state-only",
    "skip-live-state-only",
    "resolve-release-context",
    "skip-template-repository",
    "notify-server-local-deploy",
  ]) {
    assert.match(
      releaseImages,
      new RegExp(`${jobName}:[\\s\\S]*?runs-on: ubuntu-latest`),
    );
  }
  assert.match(releaseImages, /release_execution_mode: "server-local"/);
  assert.match(promoteProduction, /RELEASE_EXECUTION_MODE/);
  assert.match(promoteProduction, /images_json="\{\}"/);
});
