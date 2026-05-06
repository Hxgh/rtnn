import assert from "node:assert/strict";
import {
  existsSync,
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
  "scripts/release/resolve-client-release-context.mjs",
);
const manifestScriptPath = path.join(
  repoRoot,
  "scripts/release/write-client-release-manifest.mjs",
);
const collectArtifactsScriptPath = path.join(
  repoRoot,
  "scripts/release/collect-client-artifacts.mjs",
);
const prepareTauriSigningScriptPath = path.join(
  repoRoot,
  "scripts/release/prepare-tauri-updater-signing.mjs",
);
const prepareAndroidSigningScriptPath = path.join(
  repoRoot,
  "scripts/release/prepare-android-signing.mjs",
);
const prepareGooglePlayUploadScriptPath = path.join(
  repoRoot,
  "scripts/release/prepare-google-play-upload.mjs",
);
const googlePlayReleaseReportScriptPath = path.join(
  repoRoot,
  "scripts/release/write-google-play-release-report.mjs",
);
const prepareIosSigningScriptPath = path.join(
  repoRoot,
  "scripts/release/prepare-ios-signing.mjs",
);
const prepareAppStoreConnectUploadScriptPath = path.join(
  repoRoot,
  "scripts/release/prepare-app-store-connect-upload.mjs",
);
const appStoreConnectReleaseReportScriptPath = path.join(
  repoRoot,
  "scripts/release/write-app-store-connect-release-report.mjs",
);
const updaterManifestScriptPath = path.join(
  repoRoot,
  "scripts/release/write-tauri-updater-manifest.mjs",
);
const mergeUpdaterScriptPath = path.join(
  repoRoot,
  "scripts/release/merge-tauri-updater-fragments.mjs",
);
const collectGithubReleaseAssetsScriptPath = path.join(
  repoRoot,
  "scripts/release/collect-client-github-release-assets.mjs",
);
const mobileBoundaryScriptPath = path.join(
  repoRoot,
  "scripts/release/write-mobile-release-boundary.mjs",
);

function withTempProject(metadata, fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-client-release-"));
  try {
    mkdirSync(path.join(dir, ".rtnn"), { recursive: true });
    mkdirSync(path.join(dir, "clients/admin-tauri/src-tauri"), {
      recursive: true,
    });
    mkdirSync(path.join(dir, "clients/app-tauri/src-tauri"), {
      recursive: true,
    });
    writeFileSync(
      path.join(dir, ".rtnn/project.json"),
      `${JSON.stringify(metadata, null, 2)}\n`,
    );
    writeFileSync(
      path.join(dir, "clients/admin-tauri/src-tauri/tauri.conf.json"),
      `${JSON.stringify({ version: "0.2.0" }, null, 2)}\n`,
    );
    writeFileSync(
      path.join(dir, "clients/app-tauri/src-tauri/tauri.conf.json"),
      `${JSON.stringify({ version: "0.3.0" }, null, 2)}\n`,
    );
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

function runContext(rootDir, env = {}) {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: rootDir,
    encoding: "utf8",
    env: childProcessEnv(env),
  });

  assert.equal(result.status, 0, result.stderr);
  return parseOutput(result.stdout);
}

test("resolve-client-release-context skips repositories without project metadata", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-client-release-empty-"));
  try {
    const output = runContext(dir);
    assert.equal(output.enabled, "false");
    assert.equal(output.reason, "missing-project-metadata");
    assert.deepEqual(JSON.parse(output.client_matrix), { include: [] });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("resolve-client-release-context emits client build matrix from delivery profile", () => {
  withTempProject(
    {
      project: {
        role: "business-source",
        projectId: "acme",
      },
      delivery: {
        clients: {
          adminDesktop: {
            enabled: true,
            targets: ["macos", "windows"],
            webUrl: "https://admin.acme.test",
            channel: "testing",
          },
          appMobile: {
            enabled: false,
          },
        },
      },
    },
    (rootDir) => {
      const output = runContext(rootDir, {
        CLIENT_RELEASE_VERSION: "1.2.3",
        CLIENT_RELEASE_SYNC_DEPLOY_FACTS: "true",
        GITHUB_REF: "refs/tags/v1.2.3",
        GITHUB_REF_NAME: "v1.2.3",
        GITHUB_SHA: "1234567890abcdef",
      });
      const matrix = JSON.parse(output.client_matrix);

      assert.equal(output.enabled, "true");
      assert.equal(output.dry_run, "false");
      assert.equal(output.publish_github_release, "true");
      assert.equal(output.sync_deploy_facts, "true");
      assert.equal(output.release_channel, "testing");
      assert.equal(output.release_version, "1.2.3");
      assert.equal(output.release_tag, "v1.2.3");
      assert.deepEqual(JSON.parse(output.enabled_clients_json), [
        "adminDesktop",
      ]);
      assert.equal(matrix.include.length, 2);
      assert.deepEqual(
        matrix.include.map((item) => [item.client, item.target, item.runner]),
        [
          ["adminDesktop", "macos", "macos-latest"],
          ["adminDesktop", "windows", "windows-latest"],
        ],
      );
      assert.equal(matrix.include[0].package, "@rtnn/admin-tauri");
      assert.equal(matrix.include[0].web_url, "https://admin.acme.test");
      assert.equal(matrix.include[0].channel, "testing");
      assert.equal(matrix.include[0].shell_version, "0.2.0");
      assert.equal(
        matrix.include[0].artifact_name,
        "admin-desktop-macos-1.2.3",
      );
      assert.equal(matrix.include[0].release_kind, "desktop-unsigned");
      assert.equal(matrix.include[0].desktop_build, true);
    },
  );
});

test("resolve-client-release-context rejects deploy facts sync for mixed channels", () => {
  withTempProject(
    {
      project: {
        role: "business-source",
        projectId: "acme",
      },
      delivery: {
        clients: {
          adminDesktop: {
            enabled: true,
            targets: ["macos"],
            channel: "testing",
          },
          appMobile: {
            enabled: true,
            targets: ["android"],
            channel: "production",
          },
        },
      },
    },
    (rootDir) => {
      const result = spawnSync(process.execPath, [scriptPath], {
        cwd: rootDir,
        encoding: "utf8",
        env: {
          ...process.env,
          CLIENT_RELEASE_SYNC_DEPLOY_FACTS: "true",
          GITHUB_REF: "refs/heads/main",
          GITHUB_REF_NAME: "main",
          GITHUB_SHA: "1234567890abcdef",
        },
      });

      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /客户端发布矩阵 channel 不一致/);
    },
  );
});

test("resolve-client-release-context resolves channel-specific client web URLs", () => {
  withTempProject(
    {
      project: {
        role: "business-source",
        projectId: "acme",
      },
      domains: {
        testing: {
          app: "app.testing.acme.test",
        },
        production: {
          app: "app.acme.test",
        },
      },
      delivery: {
        clients: {
          appMobile: {
            enabled: true,
            targets: ["android"],
            channel: "production",
          },
        },
      },
    },
    (rootDir) => {
      const output = runContext(rootDir, {
        CLIENT_RELEASE_VERSION: "1.2.3",
        CLIENT_RELEASE_CHANNEL: "testing",
        GITHUB_REF: "refs/heads/main",
        GITHUB_REF_NAME: "main",
        GITHUB_SHA: "1234567890abcdef",
      });
      const matrix = JSON.parse(output.client_matrix);

      assert.equal(matrix.include.length, 1);
      assert.equal(matrix.include[0].client, "appMobile");
      assert.equal(matrix.include[0].target, "android");
      assert.equal(matrix.include[0].channel, "testing");
      assert.equal(matrix.include[0].web_url, "https://app.testing.acme.test");
    },
  );
});

test("resolve-client-release-context prefers delivery webUrls over domains", () => {
  withTempProject(
    {
      project: {
        role: "business-source",
        projectId: "acme",
      },
      domains: {
        production: {
          admin: "admin.acme.test",
        },
      },
      delivery: {
        clients: {
          adminDesktop: {
            enabled: true,
            targets: ["macos"],
            channel: "production",
            webUrls: {
              production: "https://admin-shell.acme.test",
            },
          },
        },
      },
    },
    (rootDir) => {
      const output = runContext(rootDir, {
        CLIENT_RELEASE_VERSION: "1.2.3",
        GITHUB_REF: "refs/tags/v1.2.3",
        GITHUB_REF_NAME: "v1.2.3",
        GITHUB_SHA: "1234567890abcdef",
      });
      const matrix = JSON.parse(output.client_matrix);

      assert.equal(matrix.include.length, 1);
      assert.equal(matrix.include[0].channel, "production");
      assert.equal(matrix.include[0].web_url, "https://admin-shell.acme.test");
    },
  );
});

test("prepare-tauri-updater-signing reports blocked desktop signing without secrets", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-tauri-signing-blocked-"));
  try {
    const clientDir = path.join(dir, "clients/admin-tauri");
    mkdirSync(path.join(clientDir, "src-tauri"), { recursive: true });
    writeFileSync(
      path.join(clientDir, "src-tauri/tauri.conf.json"),
      `${JSON.stringify({ bundle: { active: true } }, null, 2)}\n`,
    );

    const result = spawnSync(
      process.execPath,
      [prepareTauriSigningScriptPath],
      {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
          CLIENT_DIR: "clients/admin-tauri",
          CLIENT_NAME: "adminDesktop",
          CLIENT_TARGET: "macos",
          CLIENT_SHELL: "admin-desktop",
          CLIENT_RELEASE_VERSION: "1.2.3",
          CLIENT_CHANNEL: "testing",
          CLIENT_ARTIFACT_NAME: "admin-desktop-macos-1.2.3",
          GITHUB_REPOSITORY: "",
        },
      },
    );

    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/desktop-signing/admin-desktop-macos-1.2.3.json",
        ),
        "utf8",
      ),
    );
    const tauriConfig = JSON.parse(
      readFileSync(path.join(clientDir, "src-tauri/tauri.conf.json"), "utf8"),
    );

    assert.equal(report.schemaVersion, "rtnn.desktop-signing-boundary.v1");
    assert.equal(report.status, "blocked");
    assert.deepEqual(report.blockers, [
      "missing-tauri-updater-public-key",
      "missing-tauri-updater-endpoint",
      "missing-tauri-signing-private-key",
    ]);
    assert.equal(tauriConfig.bundle.createUpdaterArtifacts, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("prepare-tauri-updater-signing patches Tauri config without leaking private key", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-tauri-signing-ready-"));
  try {
    const clientDir = path.join(dir, "clients/admin-tauri");
    mkdirSync(path.join(clientDir, "src-tauri"), { recursive: true });
    writeFileSync(
      path.join(clientDir, "src-tauri/tauri.conf.json"),
      `${JSON.stringify(
        {
          bundle: { active: true },
          plugins: { updater: { windows: { installMode: "passive" } } },
        },
        null,
        2,
      )}\n`,
    );

    const result = spawnSync(
      process.execPath,
      [prepareTauriSigningScriptPath],
      {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
          CLIENT_DIR: "clients/admin-tauri",
          CLIENT_NAME: "adminDesktop",
          CLIENT_TARGET: "macos",
          CLIENT_SHELL: "admin-desktop",
          CLIENT_RELEASE_VERSION: "1.2.3",
          CLIENT_CHANNEL: "testing",
          CLIENT_ARTIFACT_NAME: "admin-desktop-macos-1.2.3",
          TAURI_UPDATER_PUBLIC_KEY: "public-key",
          TAURI_SIGNING_PRIVATE_KEY: "private-key-must-not-leak",
          GITHUB_REPOSITORY: "acme/business-source",
        },
      },
    );

    assert.equal(result.status, 0, result.stderr);
    const reportPath = path.join(
      dir,
      "artifacts/client-release/desktop-signing/admin-desktop-macos-1.2.3.json",
    );
    const reportText = readFileSync(reportPath, "utf8");
    const report = JSON.parse(reportText);
    const tauriConfig = JSON.parse(
      readFileSync(path.join(clientDir, "src-tauri/tauri.conf.json"), "utf8"),
    );

    assert.equal(report.status, "ready-for-signed-build");
    assert.deepEqual(report.blockers, []);
    assert.equal(report.signing.configured, true);
    assert.equal(report.updater.configured, true);
    assert.equal(
      report.updater.endpoint,
      "https://github.com/acme/business-source/releases/latest/download/admin-desktop-latest.json",
    );
    assert.equal(reportText.includes("private-key-must-not-leak"), false);
    assert.equal(tauriConfig.bundle.createUpdaterArtifacts, true);
    assert.equal(tauriConfig.plugins.updater.pubkey, "public-key");
    assert.deepEqual(tauriConfig.plugins.updater.endpoints, [
      "https://github.com/acme/business-source/releases/latest/download/admin-desktop-latest.json",
    ]);
    assert.equal(tauriConfig.plugins.updater.windows.installMode, "passive");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("prepare-tauri-updater-signing derives self-hosted updater endpoint from project metadata", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-tauri-signing-self-hosted-"));
  try {
    const clientDir = path.join(dir, "clients/admin-tauri");
    mkdirSync(path.join(clientDir, "src-tauri"), { recursive: true });
    mkdirSync(path.join(dir, ".rtnn"), { recursive: true });
    writeFileSync(
      path.join(dir, ".rtnn/project.json"),
      `${JSON.stringify(
        {
          project: { role: "business-source" },
          delivery: {
            clientDistribution: {
              enabled: true,
              provider: "self-hosted-static",
              publicBaseUrl: "https://downloads.example.com/downloads",
            },
          },
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(
      path.join(clientDir, "src-tauri/tauri.conf.json"),
      `${JSON.stringify({ bundle: { active: true } }, null, 2)}\n`,
    );

    const result = spawnSync(
      process.execPath,
      [prepareTauriSigningScriptPath],
      {
        cwd: dir,
        encoding: "utf8",
        env: childProcessEnv({
          CLIENT_DIR: "clients/admin-tauri",
          CLIENT_NAME: "adminDesktop",
          CLIENT_TARGET: "macos",
          CLIENT_SHELL: "admin-desktop",
          CLIENT_RELEASE_VERSION: "1.2.3",
          CLIENT_CHANNEL: "testing",
          CLIENT_ARTIFACT_NAME: "admin-desktop-macos-1.2.3",
          TAURI_UPDATER_PUBLIC_KEY: "public-key",
          TAURI_SIGNING_PRIVATE_KEY: "private-key-must-not-leak",
        }),
      },
    );

    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/desktop-signing/admin-desktop-macos-1.2.3.json",
        ),
        "utf8",
      ),
    );
    const tauriConfig = JSON.parse(
      readFileSync(path.join(clientDir, "src-tauri/tauri.conf.json"), "utf8"),
    );
    const expected =
      "https://downloads.example.com/downloads/releases/testing/updater/admin-desktop-latest.json";

    assert.equal(report.updater.endpoint, expected);
    assert.deepEqual(tauriConfig.plugins.updater.endpoints, [expected]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("prepare-android-signing reports blocked Android signing without secrets", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-android-signing-blocked-"));
  try {
    const result = spawnSync(
      process.execPath,
      [prepareAndroidSigningScriptPath],
      {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
          CLIENT_DIR: "clients/app-tauri",
          CLIENT_NAME: "appMobile",
          CLIENT_TARGET: "android",
          CLIENT_SHELL: "app-mobile",
          CLIENT_RELEASE_VERSION: "1.2.3",
          CLIENT_ARTIFACT_NAME: "app-mobile-android-1.2.3",
        },
      },
    );

    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/android-signing/app-mobile-android-1.2.3.json",
        ),
        "utf8",
      ),
    );

    assert.equal(report.schemaVersion, "rtnn.android-signing-boundary.v1");
    assert.equal(report.status, "blocked");
    assert.equal(report.signing.configured, false);
    assert.deepEqual(report.blockers, [
      "missing-android-keystore-base64",
      "missing-android-keystore-password",
      "missing-android-key-alias",
      "missing-android-key-password",
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("prepare-android-signing writes keystore config and patches Gradle without leaking secrets to report", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-android-signing-ready-"));
  try {
    const androidDir = path.join(
      dir,
      "clients/app-tauri/src-tauri/gen/android",
    );
    const appDir = path.join(androidDir, "app");
    mkdirSync(appDir, { recursive: true });
    writeFileSync(
      path.join(appDir, "build.gradle.kts"),
      [
        "plugins {",
        '    id("com.android.application")',
        "}",
        "",
        "android {",
        '    namespace = "com.rtnn.app"',
        "",
        "    buildTypes {",
        '        getByName("release") {',
        "            isMinifyEnabled = false",
        "        }",
        "    }",
        "}",
        "",
      ].join("\n"),
    );

    const result = spawnSync(
      process.execPath,
      [prepareAndroidSigningScriptPath],
      {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
          CLIENT_DIR: "clients/app-tauri",
          CLIENT_NAME: "appMobile",
          CLIENT_TARGET: "android",
          CLIENT_SHELL: "app-mobile",
          CLIENT_RELEASE_VERSION: "1.2.3",
          CLIENT_ARTIFACT_NAME: "app-mobile-android-1.2.3",
          ANDROID_KEYSTORE_BASE64: Buffer.from("keystore").toString("base64"),
          ANDROID_KEYSTORE_PASSWORD: "store-password-must-not-leak",
          ANDROID_KEY_ALIAS: "release",
          ANDROID_KEY_PASSWORD: "key-password-must-not-leak",
          ANDROID_KEYSTORE_PATH: path.join(dir, "keystore.jks"),
        },
      },
    );

    assert.equal(result.status, 0, result.stderr);
    const reportPath = path.join(
      dir,
      "artifacts/client-release/android-signing/app-mobile-android-1.2.3.json",
    );
    const reportText = readFileSync(reportPath, "utf8");
    const report = JSON.parse(reportText);
    const keystoreProperties = readFileSync(
      path.join(androidDir, "keystore.properties"),
      "utf8",
    );
    const gradle = readFileSync(path.join(appDir, "build.gradle.kts"), "utf8");

    assert.equal(report.status, "ready-for-android-build");
    assert.deepEqual(report.blockers, []);
    assert.equal(report.signing.configured, true);
    assert.equal(reportText.includes("store-password-must-not-leak"), false);
    assert.equal(reportText.includes("key-password-must-not-leak"), false);
    assert.match(keystoreProperties, /keyAlias=release/);
    assert.match(keystoreProperties, /password=store-password-must-not-leak/);
    assert.match(keystoreProperties, /keyPassword=key-password-must-not-leak/);
    assert.match(gradle, /import java\.io\.FileInputStream/);
    assert.match(gradle, /import java\.util\.Properties/);
    assert.match(gradle, /signingConfigs \{/);
    assert.match(
      gradle,
      /signingConfig = signingConfigs\.getByName\("release"\)/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("prepare-google-play-upload reports blocked upload without service account or artifact", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-google-play-blocked-"));
  try {
    mkdirSync(path.join(dir, "clients/app-tauri/src-tauri"), {
      recursive: true,
    });
    writeFileSync(
      path.join(dir, "clients/app-tauri/src-tauri/tauri.conf.json"),
      `${JSON.stringify({ identifier: "com.acme.app" }, null, 2)}\n`,
    );

    const result = spawnSync(
      process.execPath,
      [prepareGooglePlayUploadScriptPath],
      {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
          CLIENT_DIR: "clients/app-tauri",
          CLIENT_NAME: "appMobile",
          CLIENT_TARGET: "android",
          CLIENT_SHELL: "app-mobile",
          CLIENT_RELEASE_VERSION: "1.2.3",
          CLIENT_ARTIFACT_NAME: "app-mobile-android-1.2.3",
        },
      },
    );

    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/google-play-boundary/app-mobile-android-1.2.3.json",
        ),
        "utf8",
      ),
    );

    assert.equal(report.schemaVersion, "rtnn.google-play-upload-boundary.v1");
    assert.equal(report.status, "blocked");
    assert.equal(report.packageName, "com.acme.app");
    assert.deepEqual(report.blockers, [
      "missing-google-play-service-account",
      "missing-android-aab-artifact",
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("prepare-google-play-upload resolves release file without leaking service account", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-google-play-ready-"));
  try {
    const releaseDir = path.join(
      dir,
      "artifacts/client-release/app-mobile-android-1.2.3/mobile/bundle/release",
    );
    mkdirSync(path.join(dir, "clients/app-tauri/src-tauri"), {
      recursive: true,
    });
    mkdirSync(releaseDir, { recursive: true });
    writeFileSync(
      path.join(dir, "clients/app-tauri/src-tauri/tauri.conf.json"),
      `${JSON.stringify({ identifier: "com.acme.app" }, null, 2)}\n`,
    );
    writeFileSync(path.join(releaseDir, "app-release.aab"), "bundle");

    const result = spawnSync(
      process.execPath,
      [prepareGooglePlayUploadScriptPath],
      {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
          CLIENT_DIR: "clients/app-tauri",
          CLIENT_NAME: "appMobile",
          CLIENT_TARGET: "android",
          CLIENT_SHELL: "app-mobile",
          CLIENT_RELEASE_VERSION: "1.2.3",
          CLIENT_ARTIFACT_NAME: "app-mobile-android-1.2.3",
          ANDROID_PLAY_SERVICE_ACCOUNT_JSON:
            "service-account-json-must-not-leak",
          ANDROID_PLAY_TRACK: "internal",
          ANDROID_PLAY_STATUS: "draft",
        },
      },
    );

    assert.equal(result.status, 0, result.stderr);
    const reportPath = path.join(
      dir,
      "artifacts/client-release/google-play-boundary/app-mobile-android-1.2.3.json",
    );
    const reportText = readFileSync(reportPath, "utf8");
    const report = JSON.parse(reportText);

    assert.equal(report.status, "ready-for-upload");
    assert.equal(report.packageName, "com.acme.app");
    assert.equal(report.releaseStatus, "draft");
    assert.equal(report.releaseFile.endsWith("app-release.aab"), true);
    assert.deepEqual(report.blockers, []);
    assert.equal(
      reportText.includes("service-account-json-must-not-leak"),
      false,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("write-google-play-release-report emits uploaded and skipped facts", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-google-play-report-"));
  try {
    const boundaryPath = path.join(
      dir,
      "artifacts/client-release/google-play-boundary/app-mobile-android-1.2.3.json",
    );
    mkdirSync(path.dirname(boundaryPath), { recursive: true });
    writeFileSync(
      boundaryPath,
      `${JSON.stringify(
        {
          schemaVersion: "rtnn.google-play-upload-boundary.v1",
          client: "appMobile",
          target: "android",
          shell: "app-mobile",
          releaseVersion: "1.2.3",
          artifactName: "app-mobile-android-1.2.3",
          provider: "google-play",
          status: "ready-for-upload",
          packageName: "com.acme.app",
          track: "internal",
          releaseStatus: "draft",
          artifactType: "aab",
          releaseFile:
            "artifacts/client-release/app-mobile-android-1.2.3/mobile/bundle/release/app-release.aab",
          blockers: [],
        },
        null,
        2,
      )}\n`,
    );

    const uploaded = spawnSync(
      process.execPath,
      [googlePlayReleaseReportScriptPath],
      {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
          CLIENT_ARTIFACT_NAME: "app-mobile-android-1.2.3",
          GOOGLE_PLAY_UPLOAD_ATTEMPTED: "true",
          GOOGLE_PLAY_COMMITTED_EDIT_ID: "edit-123",
          GOOGLE_PLAY_INTERNAL_SHARING_DOWNLOAD_URLS: JSON.stringify([
            "https://play.google.test/download",
          ]),
        },
      },
    );

    assert.equal(uploaded.status, 0, uploaded.stderr);
    const uploadedReport = JSON.parse(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/google-play/app-mobile-android-1.2.3.json",
        ),
        "utf8",
      ),
    );
    assert.equal(uploadedReport.schemaVersion, "rtnn.google-play-release.v1");
    assert.equal(uploadedReport.status, "uploaded");
    assert.equal(uploadedReport.committedEditId, "edit-123");
    assert.deepEqual(uploadedReport.internalSharingDownloadUrls, [
      "https://play.google.test/download",
    ]);

    const skipped = spawnSync(
      process.execPath,
      [googlePlayReleaseReportScriptPath],
      {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
          CLIENT_ARTIFACT_NAME: "app-mobile-android-1.2.3",
          GOOGLE_PLAY_UPLOAD_ATTEMPTED: "false",
        },
      },
    );

    assert.equal(skipped.status, 0, skipped.stderr);
    const skippedReport = JSON.parse(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/google-play/app-mobile-android-1.2.3.json",
        ),
        "utf8",
      ),
    );
    assert.equal(skippedReport.status, "skipped");
    assert.equal(skippedReport.reason, "upload-not-attempted");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("prepare-ios-signing reports blocked iOS signing without secrets", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-ios-signing-blocked-"));
  try {
    const result = spawnSync(process.execPath, [prepareIosSigningScriptPath], {
      cwd: dir,
      encoding: "utf8",
      env: {
        ...process.env,
        CLIENT_NAME: "appMobile",
        CLIENT_TARGET: "ios",
        CLIENT_SHELL: "app-mobile",
        CLIENT_RELEASE_VERSION: "1.2.3",
        CLIENT_ARTIFACT_NAME: "app-mobile-ios-1.2.3",
      },
    });

    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/ios-signing/app-mobile-ios-1.2.3.json",
        ),
        "utf8",
      ),
    );

    assert.equal(report.schemaVersion, "rtnn.ios-signing-boundary.v1");
    assert.equal(report.status, "blocked");
    assert.equal(report.signing.configured, false);
    assert.deepEqual(report.blockers, [
      "missing-ios-certificate-p12-base64",
      "missing-ios-certificate-password",
      "missing-ios-provisioning-profile-base64",
      "missing-ios-keychain-password",
    ]);
    assert.deepEqual(report.uploadBlockers, [
      "missing-app-store-connect-key-id",
      "missing-app-store-connect-issuer-id",
      "missing-app-store-connect-api-key",
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("prepare-ios-signing writes signing files and App Store Connect key without leaking secrets", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-ios-signing-ready-"));
  try {
    const result = spawnSync(process.execPath, [prepareIosSigningScriptPath], {
      cwd: dir,
      encoding: "utf8",
      env: {
        ...process.env,
        RUNNER_TEMP: path.join(dir, "runner-temp"),
        CLIENT_NAME: "appMobile",
        CLIENT_TARGET: "ios",
        CLIENT_SHELL: "app-mobile",
        CLIENT_RELEASE_VERSION: "1.2.3",
        CLIENT_ARTIFACT_NAME: "app-mobile-ios-1.2.3",
        IOS_CERTIFICATE_P12_BASE64: Buffer.from(
          "p12-secret-must-not-leak",
        ).toString("base64"),
        IOS_CERTIFICATE_PASSWORD: "certificate-password-must-not-leak",
        IOS_PROVISIONING_PROFILE_BASE64: Buffer.from(
          "profile-secret-must-not-leak",
        ).toString("base64"),
        IOS_KEYCHAIN_PASSWORD: "keychain-password-must-not-leak",
        APP_STORE_CONNECT_KEY_ID: "ABC123",
        APP_STORE_CONNECT_ISSUER_ID: "issuer-123",
        APP_STORE_CONNECT_API_KEY_BASE64: Buffer.from(
          "api-key-secret-must-not-leak",
        ).toString("base64"),
      },
    });

    assert.equal(result.status, 0, result.stderr);
    const reportPath = path.join(
      dir,
      "artifacts/client-release/ios-signing/app-mobile-ios-1.2.3.json",
    );
    const reportText = readFileSync(reportPath, "utf8");
    const report = JSON.parse(reportText);
    const signingDir = path.join(dir, "runner-temp/app-mobile-ios-1.2.3");

    assert.equal(report.status, "ready-for-ios-build");
    assert.equal(report.signing.configured, true);
    assert.equal(report.signing.certificateFileWritten, true);
    assert.equal(report.signing.provisioningProfileFileWritten, true);
    assert.equal(report.appStoreConnect.configured, true);
    assert.deepEqual(report.blockers, []);
    assert.deepEqual(report.uploadBlockers, []);
    assert.equal(reportText.includes("p12-secret-must-not-leak"), false);
    assert.equal(reportText.includes("profile-secret-must-not-leak"), false);
    assert.equal(
      reportText.includes("certificate-password-must-not-leak"),
      false,
    );
    assert.equal(reportText.includes("keychain-password-must-not-leak"), false);
    assert.equal(reportText.includes("api-key-secret-must-not-leak"), false);
    assert.equal(
      readFileSync(path.join(signingDir, "ios-distribution.p12"), "utf8"),
      "p12-secret-must-not-leak",
    );
    assert.equal(
      readFileSync(
        path.join(signingDir, "ios-distribution.mobileprovision"),
        "utf8",
      ),
      "profile-secret-must-not-leak",
    );
    assert.equal(
      readFileSync(path.join(dir, "private_keys/AuthKey_ABC123.p8"), "utf8"),
      "api-key-secret-must-not-leak",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("prepare-app-store-connect-upload reports blocked upload without IPA or API key", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-app-store-blocked-"));
  try {
    mkdirSync(path.join(dir, "clients/app-tauri/src-tauri"), {
      recursive: true,
    });
    writeFileSync(
      path.join(dir, "clients/app-tauri/src-tauri/tauri.conf.json"),
      `${JSON.stringify({ identifier: "com.acme.app" }, null, 2)}\n`,
    );

    const result = spawnSync(
      process.execPath,
      [prepareAppStoreConnectUploadScriptPath],
      {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
          CLIENT_DIR: "clients/app-tauri",
          CLIENT_NAME: "appMobile",
          CLIENT_TARGET: "ios",
          CLIENT_SHELL: "app-mobile",
          CLIENT_RELEASE_VERSION: "1.2.3",
          CLIENT_ARTIFACT_NAME: "app-mobile-ios-1.2.3",
        },
      },
    );

    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/app-store-connect-boundary/app-mobile-ios-1.2.3.json",
        ),
        "utf8",
      ),
    );

    assert.equal(
      report.schemaVersion,
      "rtnn.app-store-connect-upload-boundary.v1",
    );
    assert.equal(report.status, "blocked");
    assert.equal(report.bundleId, "com.acme.app");
    assert.deepEqual(report.blockers, [
      "missing-app-store-connect-key-id",
      "missing-app-store-connect-issuer-id",
      "missing-app-store-connect-api-key",
      "missing-ios-ipa-artifact",
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("prepare-app-store-connect-upload resolves IPA without leaking private key", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-app-store-ready-"));
  try {
    const releaseDir = path.join(
      dir,
      "artifacts/client-release/app-mobile-ios-1.2.3/mobile/arm64",
    );
    mkdirSync(path.join(dir, "clients/app-tauri/src-tauri"), {
      recursive: true,
    });
    mkdirSync(releaseDir, { recursive: true });
    writeFileSync(
      path.join(dir, "clients/app-tauri/src-tauri/tauri.conf.json"),
      `${JSON.stringify({ identifier: "com.acme.app" }, null, 2)}\n`,
    );
    writeFileSync(path.join(releaseDir, "RTNN App.ipa"), "ipa");

    const result = spawnSync(
      process.execPath,
      [prepareAppStoreConnectUploadScriptPath],
      {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
          CLIENT_DIR: "clients/app-tauri",
          CLIENT_NAME: "appMobile",
          CLIENT_TARGET: "ios",
          CLIENT_SHELL: "app-mobile",
          CLIENT_RELEASE_VERSION: "1.2.3",
          CLIENT_ARTIFACT_NAME: "app-mobile-ios-1.2.3",
          APP_STORE_CONNECT_KEY_ID: "ABC123",
          APP_STORE_CONNECT_ISSUER_ID: "issuer-123",
          APP_STORE_CONNECT_API_KEY_BASE64: Buffer.from(
            "api-key-secret-must-not-leak",
          ).toString("base64"),
        },
      },
    );

    assert.equal(result.status, 0, result.stderr);
    const reportPath = path.join(
      dir,
      "artifacts/client-release/app-store-connect-boundary/app-mobile-ios-1.2.3.json",
    );
    const reportText = readFileSync(reportPath, "utf8");
    const report = JSON.parse(reportText);

    assert.equal(report.status, "ready-for-upload");
    assert.equal(report.bundleId, "com.acme.app");
    assert.equal(report.distribution, "testflight");
    assert.equal(report.ipaFile.endsWith("RTNN App.ipa"), true);
    assert.deepEqual(report.blockers, []);
    assert.equal(reportText.includes("api-key-secret-must-not-leak"), false);
    assert.equal(
      readFileSync(path.join(dir, "private_keys/AuthKey_ABC123.p8"), "utf8"),
      "api-key-secret-must-not-leak",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("write-app-store-connect-release-report emits uploaded and skipped facts", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-app-store-report-"));
  try {
    const boundaryPath = path.join(
      dir,
      "artifacts/client-release/app-store-connect-boundary/app-mobile-ios-1.2.3.json",
    );
    mkdirSync(path.dirname(boundaryPath), { recursive: true });
    writeFileSync(
      boundaryPath,
      `${JSON.stringify(
        {
          schemaVersion: "rtnn.app-store-connect-upload-boundary.v1",
          client: "appMobile",
          target: "ios",
          shell: "app-mobile",
          releaseVersion: "1.2.3",
          artifactName: "app-mobile-ios-1.2.3",
          provider: "app-store-connect",
          status: "ready-for-upload",
          bundleId: "com.acme.app",
          distribution: "testflight",
          artifactType: "ipa",
          ipaFile:
            "artifacts/client-release/app-mobile-ios-1.2.3/mobile/arm64/RTNN App.ipa",
          blockers: [],
        },
        null,
        2,
      )}\n`,
    );

    const uploaded = spawnSync(
      process.execPath,
      [appStoreConnectReleaseReportScriptPath],
      {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
          CLIENT_ARTIFACT_NAME: "app-mobile-ios-1.2.3",
          APP_STORE_CONNECT_UPLOAD_ATTEMPTED: "true",
        },
      },
    );

    assert.equal(uploaded.status, 0, uploaded.stderr);
    const uploadedReport = JSON.parse(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/app-store-connect/app-mobile-ios-1.2.3.json",
        ),
        "utf8",
      ),
    );
    assert.equal(
      uploadedReport.schemaVersion,
      "rtnn.app-store-connect-release.v1",
    );
    assert.equal(uploadedReport.status, "uploaded");
    assert.equal(uploadedReport.bundleId, "com.acme.app");
    assert.equal(uploadedReport.ipaFileName, "RTNN App.ipa");

    const skipped = spawnSync(
      process.execPath,
      [appStoreConnectReleaseReportScriptPath],
      {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
          CLIENT_ARTIFACT_NAME: "app-mobile-ios-1.2.3",
          APP_STORE_CONNECT_UPLOAD_ATTEMPTED: "false",
        },
      },
    );

    assert.equal(skipped.status, 0, skipped.stderr);
    const skippedReport = JSON.parse(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/app-store-connect/app-mobile-ios-1.2.3.json",
        ),
        "utf8",
      ),
    );
    assert.equal(skippedReport.status, "skipped");
    assert.equal(skippedReport.reason, "upload-not-attempted");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("write-tauri-updater-manifest skips unsigned desktop artifacts", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-updater-skip-"));
  try {
    const bundleOutput = path.join(
      dir,
      "artifacts/client-release/admin-desktop-macos-1.2.3/bundle",
    );
    mkdirSync(path.join(bundleOutput, "dmg"), { recursive: true });
    writeFileSync(path.join(bundleOutput, "dmg/RTNN Admin.dmg"), "bundle");
    writeFileSync(
      path.join(bundleOutput, "artifact-files.json"),
      `${JSON.stringify(
        {
          files: [{ path: "dmg/RTNN Admin.dmg", size: 6 }],
        },
        null,
        2,
      )}\n`,
    );

    const result = spawnSync(process.execPath, [updaterManifestScriptPath], {
      cwd: dir,
      encoding: "utf8",
      env: {
        ...process.env,
        CLIENT_NAME: "adminDesktop",
        CLIENT_TARGET: "macos",
        CLIENT_SHELL: "admin-desktop",
        CLIENT_RELEASE_VERSION: "1.2.3",
        CLIENT_CHANNEL: "testing",
        CLIENT_RELEASE_TAG: "v1.2.3",
        CLIENT_ARTIFACT_NAME: "admin-desktop-macos-1.2.3",
        CLIENT_UPDATER_PLATFORM: "darwin-aarch64",
        GITHUB_REPOSITORY: "acme/business-source",
      },
    });

    assert.equal(result.status, 0, result.stderr);
    const skip = JSON.parse(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/updater-skips/admin-desktop-macos-1.2.3.json",
        ),
        "utf8",
      ),
    );

    assert.equal(skip.schemaVersion, "rtnn.tauri-updater-skip.v1");
    assert.equal(skip.reason, "missing-signature");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("write-tauri-updater-manifest emits a signed Tauri updater fragment", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-updater-fragment-"));
  try {
    const bundleOutput = path.join(
      dir,
      "artifacts/client-release/admin-desktop-macos-1.2.3/bundle",
    );
    mkdirSync(path.join(bundleOutput, "macos"), { recursive: true });
    writeFileSync(
      path.join(bundleOutput, "macos/RTNN Admin.app.tar.gz"),
      "bundle",
    );
    writeFileSync(
      path.join(bundleOutput, "macos/RTNN Admin.app.tar.gz.sig"),
      "signed",
    );
    writeFileSync(
      path.join(bundleOutput, "artifact-files.json"),
      `${JSON.stringify(
        {
          files: [
            { path: "macos/RTNN Admin.app.tar.gz", size: 6 },
            { path: "macos/RTNN Admin.app.tar.gz.sig", size: 6 },
          ],
        },
        null,
        2,
      )}\n`,
    );

    const result = spawnSync(process.execPath, [updaterManifestScriptPath], {
      cwd: dir,
      encoding: "utf8",
      env: {
        ...process.env,
        CLIENT_NAME: "adminDesktop",
        CLIENT_TARGET: "macos",
        CLIENT_SHELL: "admin-desktop",
        CLIENT_RELEASE_VERSION: "1.2.3",
        CLIENT_CHANNEL: "testing",
        CLIENT_RELEASE_TAG: "v1.2.3",
        CLIENT_ARTIFACT_NAME: "admin-desktop-macos-1.2.3",
        CLIENT_UPDATER_PLATFORM: "darwin-aarch64",
        CLIENT_UPDATER_PUB_DATE: "2026-04-29T00:00:00.000Z",
        CLIENT_UPDATER_NOTES: "Release 1.2.3",
        GITHUB_REPOSITORY: "acme/business-source",
      },
    });

    assert.equal(result.status, 0, result.stderr);
    const fragment = JSON.parse(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/updater-fragments/admin-desktop-macos-1.2.3.json",
        ),
        "utf8",
      ),
    );

    assert.equal(fragment.schemaVersion, "rtnn.tauri-updater-fragment.v1");
    assert.equal(fragment.latest.version, "1.2.3");
    assert.equal(fragment.latest.pub_date, "2026-04-29T00:00:00.000Z");
    assert.deepEqual(fragment.latest.platforms, {
      "darwin-aarch64": {
        signature: "signed",
        url: "https://github.com/acme/business-source/releases/download/v1.2.3/RTNN%20Admin.app.tar.gz",
      },
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("write-tauri-updater-manifest can point update assets at self-hosted distribution", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-updater-fragment-self-hosted-"));
  try {
    const bundleOutput = path.join(
      dir,
      "artifacts/client-release/admin-desktop-macos-1.2.3/bundle",
    );
    mkdirSync(path.join(bundleOutput, "macos"), { recursive: true });
    writeFileSync(
      path.join(bundleOutput, "macos/RTNN Admin.app.tar.gz"),
      "bundle",
    );
    writeFileSync(
      path.join(bundleOutput, "macos/RTNN Admin.app.tar.gz.sig"),
      "signed",
    );
    writeFileSync(
      path.join(bundleOutput, "artifact-files.json"),
      `${JSON.stringify(
        {
          files: [
            { path: "macos/RTNN Admin.app.tar.gz", size: 6 },
            { path: "macos/RTNN Admin.app.tar.gz.sig", size: 6 },
          ],
        },
        null,
        2,
      )}\n`,
    );

    const result = spawnSync(process.execPath, [updaterManifestScriptPath], {
      cwd: dir,
      encoding: "utf8",
      env: childProcessEnv({
        CLIENT_NAME: "adminDesktop",
        CLIENT_TARGET: "macos",
        CLIENT_SHELL: "admin-desktop",
        CLIENT_RELEASE_VERSION: "1.2.3",
        CLIENT_CHANNEL: "testing",
        CLIENT_RELEASE_TAG: "v1.2.3",
        CLIENT_ARTIFACT_NAME: "admin-desktop-macos-1.2.3",
        CLIENT_UPDATER_PLATFORM: "darwin-aarch64",
        CLIENT_DISTRIBUTION_PUBLIC_BASE_URL: "https://downloads.example.com",
        GITHUB_REPOSITORY: "acme/business-source",
      }),
    });

    assert.equal(result.status, 0, result.stderr);
    const fragment = JSON.parse(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/updater-fragments/admin-desktop-macos-1.2.3.json",
        ),
        "utf8",
      ),
    );

    assert.equal(fragment.channel, "testing");
    assert.deepEqual(fragment.latest.platforms, {
      "darwin-aarch64": {
        signature: "signed",
        url: "https://downloads.example.com/releases/testing/admin-desktop/macos/1.2.3/RTNN%20Admin.app.tar.gz",
      },
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("merge-tauri-updater-fragments emits final static updater manifests", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-updater-merge-"));
  try {
    const fragmentDir = path.join(
      dir,
      "artifacts/client-release/updater-fragments",
    );
    mkdirSync(fragmentDir, { recursive: true });
    writeFileSync(
      path.join(fragmentDir, "admin-desktop-macos-1.2.3.json"),
      `${JSON.stringify(
        {
          schemaVersion: "rtnn.tauri-updater-fragment.v1",
          client: "adminDesktop",
          target: "macos",
          shell: "admin-desktop",
          artifactName: "admin-desktop-macos-1.2.3",
          releaseTag: "v1.2.3",
          latest: {
            version: "1.2.3",
            notes: "Release 1.2.3",
            pub_date: "2026-04-29T00:00:00.000Z",
            platforms: {
              "darwin-aarch64": {
                signature: "macos-signature",
                url: "https://example.com/RTNN%20Admin.app.tar.gz",
              },
            },
          },
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(
      path.join(fragmentDir, "admin-desktop-windows-1.2.3.json"),
      `${JSON.stringify(
        {
          schemaVersion: "rtnn.tauri-updater-fragment.v1",
          client: "adminDesktop",
          target: "windows",
          shell: "admin-desktop",
          artifactName: "admin-desktop-windows-1.2.3",
          releaseTag: "v1.2.3",
          latest: {
            version: "1.2.3",
            notes: "Release 1.2.3",
            pub_date: "2026-04-29T00:00:00.000Z",
            platforms: {
              "windows-x86_64": {
                signature: "windows-signature",
                url: "https://example.com/RTNN%20Admin.exe",
              },
            },
          },
        },
        null,
        2,
      )}\n`,
    );

    const result = spawnSync(process.execPath, [mergeUpdaterScriptPath], {
      cwd: dir,
      encoding: "utf8",
      env: {
        ...process.env,
      },
    });

    assert.equal(result.status, 0, result.stderr);
    const latest = JSON.parse(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/updater/admin-desktop-latest.json",
        ),
        "utf8",
      ),
    );
    assert.deepEqual(latest, {
      version: "1.2.3",
      notes: "Release 1.2.3",
      pub_date: "2026-04-29T00:00:00.000Z",
      platforms: {
        "darwin-aarch64": {
          signature: "macos-signature",
          url: "https://example.com/RTNN%20Admin.app.tar.gz",
        },
        "windows-x86_64": {
          signature: "windows-signature",
          url: "https://example.com/RTNN%20Admin.exe",
        },
      },
    });

    const index = JSON.parse(
      readFileSync(
        path.join(dir, "artifacts/client-release/updater/index.json"),
        "utf8",
      ),
    );
    assert.deepEqual(index.manifests, [
      {
        shell: "admin-desktop",
        file: "admin-desktop-latest.json",
        version: "1.2.3",
        platforms: ["darwin-aarch64", "windows-x86_64"],
      },
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("collect-client-github-release-assets copies desktop bundles and updater manifests", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-github-release-assets-"));
  try {
    const downloadedDir = path.join(dir, "artifacts/downloaded");
    const bundleDir = path.join(
      downloadedDir,
      "admin-desktop-macos-1.2.3-bundle",
      "dmg",
    );
    const updaterDir = path.join(downloadedDir, "tauri-updater-manifests");
    mkdirSync(bundleDir, { recursive: true });
    mkdirSync(updaterDir, { recursive: true });
    writeFileSync(path.join(bundleDir, "RTNN Admin.dmg"), "bundle");
    writeFileSync(path.join(bundleDir, "artifact-files.json"), "{}");
    writeFileSync(
      path.join(updaterDir, "admin-desktop-latest.json"),
      JSON.stringify({ version: "1.2.3" }),
    );
    writeFileSync(
      path.join(updaterDir, "index.json"),
      JSON.stringify({ manifests: [] }),
    );

    const result = spawnSync(
      process.execPath,
      [collectGithubReleaseAssetsScriptPath],
      {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
        },
      },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/github-release-assets/RTNN Admin.dmg",
        ),
        "utf8",
      ),
      "bundle",
    );
    assert.equal(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/github-release-assets/admin-desktop-latest.json",
        ),
        "utf8",
      ),
      JSON.stringify({ version: "1.2.3" }),
    );
    const assetManifest = JSON.parse(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/github-release-assets/asset-files.json",
        ),
        "utf8",
      ),
    );
    assert.deepEqual(
      assetManifest.assets.map((asset) => asset.name),
      ["admin-desktop-latest.json", "index.json", "RTNN Admin.dmg"],
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("collect-client-github-release-assets skips macOS app internal resources", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-github-release-assets-app-"));
  try {
    const downloadedDir = path.join(dir, "artifacts/downloaded");
    const bundleDir = path.join(
      downloadedDir,
      "admin-desktop-macos-1.2.3-bundle",
    );
    mkdirSync(path.join(bundleDir, "dmg"), { recursive: true });
    mkdirSync(
      path.join(bundleDir, "macos/RTNN Admin.app/Contents/Resources"),
      { recursive: true },
    );
    writeFileSync(path.join(bundleDir, "dmg/RTNN Admin.icns"), "dmg icon");
    writeFileSync(path.join(bundleDir, "dmg/RTNN Admin.dmg"), "dmg");
    writeFileSync(
      path.join(
        bundleDir,
        "macos/RTNN Admin.app/Contents/Resources/RTNN Admin.icns",
      ),
      "app icon",
    );

    const result = spawnSync(
      process.execPath,
      [collectGithubReleaseAssetsScriptPath],
      {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
        },
      },
    );

    assert.equal(result.status, 0, result.stderr);
    const assetManifest = JSON.parse(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/github-release-assets/asset-files.json",
        ),
        "utf8",
      ),
    );
    assert.deepEqual(assetManifest.assets.map((asset) => asset.name), [
      "RTNN Admin.dmg",
    ]);
    assert.equal(
      existsSync(
        path.join(
          dir,
          "artifacts/client-release/github-release-assets/RTNN Admin.icns",
        ),
      ),
      false,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("resolve-client-release-context skips business repositories without enabled clients", () => {
  withTempProject(
    {
      project: {
        role: "business-source",
        projectId: "acme",
      },
      delivery: {
        services: {
          app: { enabled: false },
        },
      },
    },
    (rootDir) => {
      const output = runContext(rootDir);
      assert.equal(output.enabled, "false");
      assert.equal(output.reason, "no-enabled-clients");
    },
  );
});

test("write-client-release-manifest emits a normalized manifest artifact", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-client-manifest-"));
  try {
    const result = spawnSync(process.execPath, [manifestScriptPath], {
      cwd: dir,
      encoding: "utf8",
      env: {
        ...process.env,
        CLIENT_NAME: "adminDesktop",
        CLIENT_TARGET: "macos",
        CLIENT_SHELL: "admin-desktop",
        CLIENT_PACKAGE: "@rtnn/admin-tauri",
        CLIENT_RELEASE_VERSION: "1.2.3",
        CLIENT_SHELL_VERSION: "0.2.0",
        CLIENT_CHANNEL: "testing",
        CLIENT_RELEASE_KIND: "desktop-unsigned",
        CLIENT_RELEASE_DRY_RUN: "false",
        CLIENT_WEB_URL: "https://admin.acme.test",
        CLIENT_SOURCE_SHA: "1234567890abcdef",
        CLIENT_SOURCE_REF: "refs/tags/v1.2.3",
        CLIENT_ARTIFACT_NAME: "admin-desktop-macos-1.2.3",
        RTNN_RELEASE_GENERATED_AT: "2026-04-29T00:00:00.000Z",
      },
    });

    assert.equal(result.status, 0, result.stderr);
    const manifest = JSON.parse(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/admin-desktop-macos-1.2.3.json",
        ),
        "utf8",
      ),
    );

    assert.equal(manifest.schemaVersion, "rtnn.client-release.v1");
    assert.equal(manifest.client, "adminDesktop");
    assert.equal(manifest.target, "macos");
    assert.equal(manifest.releaseVersion, "1.2.3");
    assert.equal(manifest.releaseKind, "desktop-unsigned");
    assert.equal(manifest.dryRun, false);
    assert.equal(manifest.generatedAt, "2026-04-29T00:00:00.000Z");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("collect-client-artifacts copies bundle outputs and writes file manifest", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-client-artifacts-"));
  try {
    const bundleDir = path.join(
      dir,
      "clients/admin-tauri/src-tauri/target/release/bundle/dmg",
    );
    mkdirSync(bundleDir, { recursive: true });
    writeFileSync(path.join(bundleDir, "RTNN Admin.dmg"), "bundle");

    const result = spawnSync(process.execPath, [collectArtifactsScriptPath], {
      cwd: dir,
      encoding: "utf8",
      env: {
        ...process.env,
        CLIENT_DIR: "clients/admin-tauri",
        CLIENT_ARTIFACT_NAME: "admin-desktop-macos-1.2.3",
      },
    });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/admin-desktop-macos-1.2.3/bundle/dmg/RTNN Admin.dmg",
        ),
        "utf8",
      ),
      "bundle",
    );

    const manifest = JSON.parse(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/admin-desktop-macos-1.2.3/bundle/artifact-files.json",
        ),
        "utf8",
      ),
    );
    assert.deepEqual(manifest.files, [
      {
        path: "dmg/RTNN Admin.dmg",
        size: 6,
      },
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("write-mobile-release-boundary emits blocked Android release policy", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-mobile-android-"));
  try {
    const result = spawnSync(process.execPath, [mobileBoundaryScriptPath], {
      cwd: dir,
      encoding: "utf8",
      env: {
        ...process.env,
        CLIENT_NAME: "appMobile",
        CLIENT_TARGET: "android",
        CLIENT_SHELL: "app-mobile",
        CLIENT_PACKAGE: "@rtnn/app-tauri",
        CLIENT_RELEASE_VERSION: "1.2.3",
        CLIENT_SHELL_VERSION: "0.3.0",
        CLIENT_CHANNEL: "testing",
        CLIENT_RELEASE_KIND: "mobile-manifest-only",
        CLIENT_WEB_URL: "https://app.acme.test",
        CLIENT_SOURCE_SHA: "1234567890abcdef",
        CLIENT_SOURCE_REF: "refs/tags/v1.2.3",
        CLIENT_ARTIFACT_NAME: "app-mobile-android-1.2.3",
        RTNN_RELEASE_GENERATED_AT: "2026-04-29T00:00:00.000Z",
      },
    });

    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/mobile-boundary/app-mobile-android-1.2.3.json",
        ),
        "utf8",
      ),
    );

    assert.equal(report.schemaVersion, "rtnn.mobile-release-boundary.v1");
    assert.equal(report.status, "blocked");
    assert.equal(report.build.implemented, false);
    assert.equal(report.build.status, "blocked");
    assert.equal(report.policy.platform, "android");
    assert.equal(report.policy.artifactType, "aab");
    assert.deepEqual(report.policy.blockers, [
      "missing-android-signing-config",
      "missing-google-play-config",
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("write-mobile-release-boundary marks Android build implemented when artifact was collected", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-mobile-android-built-"));
  try {
    const result = spawnSync(process.execPath, [mobileBoundaryScriptPath], {
      cwd: dir,
      encoding: "utf8",
      env: {
        ...process.env,
        CLIENT_NAME: "appMobile",
        CLIENT_TARGET: "android",
        CLIENT_SHELL: "app-mobile",
        CLIENT_PACKAGE: "@rtnn/app-tauri",
        CLIENT_RELEASE_VERSION: "1.2.3",
        CLIENT_SHELL_VERSION: "0.3.0",
        CLIENT_CHANNEL: "testing",
        CLIENT_RELEASE_KIND: "android-signed-aab",
        CLIENT_WEB_URL: "https://app.acme.test",
        CLIENT_SOURCE_SHA: "1234567890abcdef",
        CLIENT_SOURCE_REF: "refs/tags/v1.2.3",
        CLIENT_ARTIFACT_NAME: "app-mobile-android-1.2.3",
        ANDROID_SIGNING_CONFIGURED: "true",
        ANDROID_PLAY_CONFIGURED: "true",
        MOBILE_BUILD_IMPLEMENTED: "true",
        MOBILE_BUILD_ARTIFACT_DIR:
          "artifacts/client-release/app-mobile-android-1.2.3/mobile",
        RTNN_RELEASE_GENERATED_AT: "2026-04-29T00:00:00.000Z",
      },
    });

    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/mobile-boundary/app-mobile-android-1.2.3.json",
        ),
        "utf8",
      ),
    );

    assert.equal(report.status, "ready-for-store-build");
    assert.deepEqual(report.build, {
      implemented: true,
      status: "built",
      artifactDir: "artifacts/client-release/app-mobile-android-1.2.3/mobile",
      blockers: [],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("write-mobile-release-boundary emits ready iOS store policy when configured", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-mobile-ios-"));
  try {
    const result = spawnSync(process.execPath, [mobileBoundaryScriptPath], {
      cwd: dir,
      encoding: "utf8",
      env: {
        ...process.env,
        CLIENT_NAME: "appMobile",
        CLIENT_TARGET: "ios",
        CLIENT_SHELL: "app-mobile",
        CLIENT_PACKAGE: "@rtnn/app-tauri",
        CLIENT_RELEASE_VERSION: "1.2.3",
        CLIENT_SHELL_VERSION: "0.3.0",
        CLIENT_CHANNEL: "production",
        CLIENT_RELEASE_KIND: "mobile-manifest-only",
        CLIENT_WEB_URL: "https://app.acme.test",
        CLIENT_SOURCE_SHA: "1234567890abcdef",
        CLIENT_SOURCE_REF: "refs/tags/v1.2.3",
        CLIENT_ARTIFACT_NAME: "app-mobile-ios-1.2.3",
        IOS_SIGNING_CONFIGURED: "true",
        APP_STORE_CONNECT_CONFIGURED: "true",
        RTNN_RELEASE_GENERATED_AT: "2026-04-29T00:00:00.000Z",
      },
    });

    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(
      readFileSync(
        path.join(
          dir,
          "artifacts/client-release/mobile-boundary/app-mobile-ios-1.2.3.json",
        ),
        "utf8",
      ),
    );

    assert.equal(report.status, "ready-for-store-build");
    assert.equal(report.policy.platform, "ios");
    assert.equal(report.policy.artifactType, "ipa");
    assert.equal(report.policy.store.provider, "app-store-connect");
    assert.deepEqual(report.policy.blockers, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
