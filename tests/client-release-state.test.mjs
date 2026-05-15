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

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const scriptPath = path.join(
  repoRoot,
  "scripts/release/sync-client-release-state.mjs",
);

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function setupProject() {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-client-state-"));

  writeJson(path.join(dir, ".rtnn/project.json"), {
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
    liveState: {
      testing: {},
      production: {},
    },
  });

  const artifactsDir = path.join(dir, "artifacts/client-release");
  writeJson(path.join(artifactsDir, "admin-desktop-macos-1.2.3.json"), {
    schemaVersion: "rtnn.client-release.v1",
    client: "adminDesktop",
    target: "macos",
    shell: "admin-desktop",
    packageName: "@rtnn/admin-tauri",
    releaseVersion: "1.2.3",
    shellVersion: "0.2.0",
    channel: "testing",
    releaseKind: "desktop-unsigned",
    dryRun: false,
    webUrl: "https://admin.acme.test",
    sourceSha: "1234567890abcdef",
    sourceRef: "refs/tags/v1.2.3",
    artifactName: "admin-desktop-macos-1.2.3",
    generatedAt: "2026-04-29T00:00:00.000Z",
  });
  writeJson(path.join(artifactsDir, "app-mobile-android-1.2.3.json"), {
    schemaVersion: "rtnn.client-release.v1",
    client: "appMobile",
    target: "android",
    shell: "app-mobile",
    packageName: "@rtnn/app-tauri",
    releaseVersion: "1.2.3",
    shellVersion: "0.3.0",
    channel: "testing",
    releaseKind: "mobile-manifest-only",
    dryRun: false,
    webUrl: "https://app.acme.test",
    sourceSha: "1234567890abcdef",
    sourceRef: "refs/tags/v1.2.3",
    artifactName: "app-mobile-android-1.2.3",
    generatedAt: "2026-04-29T00:00:00.000Z",
  });
  writeJson(path.join(artifactsDir, "app-mobile-ios-1.2.3.json"), {
    schemaVersion: "rtnn.client-release.v1",
    client: "appMobile",
    target: "ios",
    shell: "app-mobile",
    packageName: "@rtnn/app-tauri",
    releaseVersion: "1.2.3",
    shellVersion: "0.3.0",
    channel: "testing",
    releaseKind: "ios-signed-ipa",
    dryRun: false,
    webUrl: "https://app.acme.test",
    sourceSha: "1234567890abcdef",
    sourceRef: "refs/tags/v1.2.3",
    artifactName: "app-mobile-ios-1.2.3",
    generatedAt: "2026-04-29T00:00:00.000Z",
  });
  writeJson(path.join(artifactsDir, "updater/index.json"), {
    schemaVersion: "rtnn.tauri-updater-index.v1",
    manifests: [
      {
        shell: "admin-desktop",
        file: "admin-desktop-latest.json",
        version: "1.2.3",
        platforms: ["darwin-aarch64"],
      },
    ],
  });
  writeJson(
    path.join(
      artifactsDir,
      "desktop-signing/admin-desktop-macos-1.2.3.json",
    ),
    {
      schemaVersion: "rtnn.desktop-signing-boundary.v1",
      client: "adminDesktop",
      target: "macos",
      shell: "admin-desktop",
      releaseVersion: "1.2.3",
      channel: "testing",
      artifactName: "admin-desktop-macos-1.2.3",
      status: "ready-for-signed-build",
      signing: {
        configured: true,
      },
      updater: {
        configured: true,
        endpoint: "https://github.com/acme/business-source/releases/latest/download/admin-desktop-latest.json",
      },
      blockers: [],
    },
  );
  writeJson(
    path.join(
      artifactsDir,
      "mobile-boundary/app-mobile-android-1.2.3.json",
    ),
    {
      schemaVersion: "rtnn.mobile-release-boundary.v1",
      client: "appMobile",
      target: "android",
      shell: "app-mobile",
      packageName: "@rtnn/app-tauri",
      releaseVersion: "1.2.3",
      shellVersion: "0.3.0",
      channel: "testing",
      releaseKind: "mobile-manifest-only",
      webUrl: "https://app.acme.test",
      sourceSha: "1234567890abcdef",
      sourceRef: "refs/tags/v1.2.3",
      artifactName: "app-mobile-android-1.2.3",
      status: "blocked",
      build: {
        implemented: false,
        status: "blocked",
      },
      policy: {
        platform: "android",
        artifactType: "aab",
        store: {
          provider: "google-play",
        },
        blockers: [
          "missing-android-signing-config",
          "missing-google-play-config",
        ],
      },
    },
  );
  writeJson(
    path.join(artifactsDir, "google-play/app-mobile-android-1.2.3.json"),
    {
      schemaVersion: "rtnn.google-play-release.v1",
      client: "appMobile",
      target: "android",
      shell: "app-mobile",
      releaseVersion: "1.2.3",
      artifactName: "app-mobile-android-1.2.3",
      provider: "google-play",
      status: "skipped",
      reason: "missing-google-play-service-account",
      packageName: "com.acme.app",
      track: "internal",
      releaseStatus: "draft",
      artifactType: "aab",
      releaseFileName: null,
      committedEditId: null,
    },
  );
  writeJson(
    path.join(
      artifactsDir,
      "mobile-boundary/app-mobile-ios-1.2.3.json",
    ),
    {
      schemaVersion: "rtnn.mobile-release-boundary.v1",
      client: "appMobile",
      target: "ios",
      shell: "app-mobile",
      packageName: "@rtnn/app-tauri",
      releaseVersion: "1.2.3",
      shellVersion: "0.3.0",
      channel: "testing",
      releaseKind: "ios-signed-ipa",
      webUrl: "https://app.acme.test",
      sourceSha: "1234567890abcdef",
      sourceRef: "refs/tags/v1.2.3",
      artifactName: "app-mobile-ios-1.2.3",
      status: "ready-for-store-build",
      build: {
        implemented: true,
        status: "built",
        artifactDir: "artifacts/client-release/app-mobile-ios-1.2.3/mobile",
      },
      policy: {
        platform: "ios",
        artifactType: "ipa",
        store: {
          provider: "app-store-connect",
        },
        blockers: [],
      },
    },
  );
  writeJson(
    path.join(
      artifactsDir,
      "app-store-connect/app-mobile-ios-1.2.3.json",
    ),
    {
      schemaVersion: "rtnn.app-store-connect-release.v1",
      client: "appMobile",
      target: "ios",
      shell: "app-mobile",
      releaseVersion: "1.2.3",
      artifactName: "app-mobile-ios-1.2.3",
      provider: "app-store-connect",
      status: "uploaded",
      reason: null,
      bundleId: "com.acme.app",
      distribution: "testflight",
      artifactType: "ipa",
      ipaFileName: "RTNN.ipa",
    },
  );

  return dir;
}

function runSync(rootDir, mode) {
  return spawnSync(
    process.execPath,
    [
      scriptPath,
      "--artifacts-dir",
      "artifacts/client-release",
      "--environment",
      "testing",
      mode,
    ],
    {
      cwd: rootDir,
      encoding: "utf8",
      env: {
        ...process.env,
      },
    },
  );
}

test("sync-client-release-state checks and writes client liveState facts", () => {
  const dir = setupProject();
  try {
    const checkBefore = runSync(dir, "--check");
    assert.equal(checkBefore.status, 1);
    assert.match(checkBefore.stderr, /客户端 liveState 与 release facts 不一致/);

    const writeResult = runSync(dir, "--write");
    assert.equal(writeResult.status, 0, writeResult.stderr);

    const metadata = JSON.parse(
      readFileSync(path.join(dir, ".rtnn/project.json"), "utf8"),
    );
    assert.equal(
      metadata.liveState.testing.clients.adminDesktop.macos.releaseVersion,
      "1.2.3",
    );
    assert.deepEqual(
      metadata.liveState.testing.clients.adminDesktop.macos.updater,
      {
        file: "admin-desktop-latest.json",
        version: "1.2.3",
        platforms: ["darwin-aarch64"],
      },
    );
    assert.deepEqual(
      metadata.liveState.testing.clients.adminDesktop.macos.desktop,
      {
        status: "ready-for-signed-build",
        signingConfigured: true,
        updaterConfigured: true,
        updaterEndpoint:
          "https://github.com/acme/business-source/releases/latest/download/admin-desktop-latest.json",
        blockers: [],
      },
    );
    assert.deepEqual(metadata.liveState.testing.clients.appMobile.android.mobile, {
      status: "blocked",
      buildStatus: "blocked",
      buildImplemented: false,
      artifactType: "aab",
      storeProvider: "google-play",
      storeRelease: {
        provider: "google-play",
        status: "skipped",
        track: "internal",
        releaseStatus: "draft",
        packageName: "com.acme.app",
        releaseFileName: null,
        reason: "missing-google-play-service-account",
      },
      blockers: [
        "missing-android-signing-config",
        "missing-google-play-config",
      ],
    });
    assert.deepEqual(metadata.liveState.testing.clients.appMobile.ios.mobile, {
      status: "ready-for-store-build",
      buildStatus: "built",
      buildImplemented: true,
      buildArtifactDir: "artifacts/client-release/app-mobile-ios-1.2.3/mobile",
      artifactType: "ipa",
      storeProvider: "app-store-connect",
      storeRelease: {
        provider: "app-store-connect",
        status: "uploaded",
        distribution: "testflight",
        bundleId: "com.acme.app",
        ipaFileName: "RTNN.ipa",
      },
      blockers: [],
    });

    const checkAfter = runSync(dir, "--check");
    assert.equal(checkAfter.status, 0, checkAfter.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
