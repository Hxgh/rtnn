import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");
const scriptPath = path.join(repoRoot, "scripts/release/prime-android-gradle.mjs");

test("prime Android Gradle patches wrapper timeout, distribution mirror, and Maven mirrors", () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "rtnn-android-gradle-"));
  try {
    const androidDir = path.join(
      tempDir,
      "clients/app-tauri/src-tauri/gen/android",
    );
    const wrapperDir = path.join(androidDir, "gradle/wrapper");
    mkdirSync(wrapperDir, { recursive: true });
    writeFileSync(
      path.join(wrapperDir, "gradle-wrapper.properties"),
      "distributionUrl=https\\://services.gradle.org/distributions/gradle-8.14.3-bin.zip\n",
    );
    writeFileSync(
      path.join(androidDir, "build.gradle.kts"),
      `buildscript {
    repositories {
        google()
        mavenCentral()
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
`,
    );

    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: tempDir,
      encoding: "utf8",
      env: {
        ...process.env,
        GRADLE_DISTRIBUTION_BASE_URL: "https://mirrors.example.test/gradle",
        GRADLE_WRAPPER_NETWORK_TIMEOUT: "90000",
        GRADLE_WRAPPER_PRIME_DOWNLOAD: "false",
        ANDROID_MAVEN_REPOSITORY_URLS:
          "https://maven.example.test/google,https://maven.example.test/public",
      },
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const wrapper = readFileSync(
      path.join(wrapperDir, "gradle-wrapper.properties"),
      "utf8",
    );
    const buildGradle = readFileSync(
      path.join(androidDir, "build.gradle.kts"),
      "utf8",
    );

    assert.match(
      wrapper,
      /distributionUrl=https\\:\/\/mirrors\.example\.test\/gradle\/gradle-8\.14\.3-bin\.zip/,
    );
    assert.match(wrapper, /^networkTimeout=90000$/m);
    assert.equal(
      buildGradle.match(/RTNN_ANDROID_MAVEN_MIRRORS_START/g)?.length,
      2,
    );
    assert.match(
      buildGradle,
      /maven \{ url = uri\("https:\/\/maven\.example\.test\/google"\) \}/,
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
