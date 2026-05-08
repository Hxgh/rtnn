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
  "scripts/release/prepare-tauri-remote-web-url.mjs",
);

function withTempClient(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "rtnn-tauri-web-url-"));
  const clientDir = path.join(dir, "clients/app-tauri");
  const srcTauriDir = path.join(clientDir, "src-tauri");
  const capabilitiesDir = path.join(srcTauriDir, "capabilities");

  try {
    mkdirSync(capabilitiesDir, { recursive: true });
    writeFileSync(
      path.join(srcTauriDir, "tauri.conf.json"),
      `${JSON.stringify(
        {
          build: {
            devUrl: "http://localhost:5102",
            frontendDist: "https://app.example.com",
          },
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(
      path.join(capabilitiesDir, "mobile.json"),
      `${JSON.stringify(
        {
          remote: {
            urls: [
              "http://localhost:5102",
              "https://app.example.com",
              "https://old-app.example.net",
            ],
          },
        },
        null,
        2,
      )}\n`,
    );

    return fn({ dir, clientDir, srcTauriDir, capabilitiesDir });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function runScript(rootDir, env = {}) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...process.env,
      CLIENT_DIR: "clients/app-tauri",
      CLIENT_NAME: "appMobile",
      CLIENT_TARGET: "android",
      CLIENT_SHELL: "app-mobile",
      CLIENT_ARTIFACT_NAME: "app-mobile-android-1.2.3",
      ...env,
    },
  });
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

test("prepare-tauri-remote-web-url patches Tauri config and capability URLs", () => {
  withTempClient(({ dir, srcTauriDir, capabilitiesDir }) => {
    const result = runScript(dir, {
      CLIENT_WEB_URL: "https://app.testing.acme.test/",
    });

    assert.equal(result.status, 0, result.stderr);

    const config = readJson(path.join(srcTauriDir, "tauri.conf.json"));
    const capability = readJson(path.join(capabilitiesDir, "mobile.json"));
    const report = readJson(
      path.join(
        dir,
        "artifacts/client-release/tauri-remote-web-url/app-mobile-android-1.2.3.json",
      ),
    );

    assert.equal(
      config.build.frontendDist,
      "https://app.testing.acme.test",
    );
    assert.deepEqual(capability.remote.urls, [
      "http://localhost:5102",
      "https://app.testing.acme.test",
    ]);
    assert.equal(report.schemaVersion, "rtnn.tauri-remote-web-url.v1");
    assert.equal(report.webUrl, "https://app.testing.acme.test");
    assert.equal(report.config.previousFrontendDistConfigured, true);
    assert.equal(
      JSON.stringify(report).includes("https://app.example.com"),
      false,
    );
  });
});

test("prepare-tauri-remote-web-url rejects placeholder domains", () => {
  withTempClient(({ dir }) => {
    const result = runScript(dir, {
      CLIENT_WEB_URL: "https://app.example.com",
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /模板占位域名/);
  });
});

test("prepare-tauri-remote-web-url rejects local development URLs", () => {
  withTempClient(({ dir }) => {
    const result = runScript(dir, {
      CLIENT_WEB_URL: "http://localhost:5102",
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /必须是 https URL/);
  });
});

test("prepare-tauri-remote-web-url rejects wildcard host URLs", () => {
  withTempClient(({ dir }) => {
    const result = runScript(dir, {
      CLIENT_WEB_URL: "https://0.0.0.0:5102",
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /本地开发地址/);
  });
});
