#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const checks = [
  ["node", ["--check", "scripts/lib/release-facts.mjs"], "release facts lib syntax"],
  ["node", ["--check", "scripts/release/resolve-client-release-context.mjs"], "client release context syntax"],
  ["node", ["--check", "scripts/release/prepare-tauri-remote-web-url.mjs"], "tauri remote web url syntax"],
  ["node", ["--check", "scripts/release/write-client-release-manifest.mjs"], "client release manifest syntax"],
  ["node", ["--check", "scripts/release/collect-client-artifacts.mjs"], "client artifact collection syntax"],
  ["node", ["--check", "scripts/release/check-client-artifact-urls.mjs"], "client artifact url check syntax"],
  ["node", ["--check", "scripts/client/check-android-apk-package.mjs"], "android package check syntax"],
  ["node", ["--check", "scripts/release/prepare-tauri-updater-signing.mjs"], "tauri updater signing syntax"],
  ["node", ["--check", "scripts/release/prepare-android-signing.mjs"], "android signing syntax"],
  ["node", ["--check", "scripts/release/prime-android-gradle.mjs"], "android gradle prime syntax"],
  ["node", ["--check", "scripts/release/prepare-google-play-upload.mjs"], "google play upload syntax"],
  ["node", ["--check", "scripts/release/write-google-play-release-report.mjs"], "google play report syntax"],
  ["node", ["--check", "scripts/release/prepare-ios-signing.mjs"], "ios signing syntax"],
  ["node", ["--check", "scripts/release/prepare-app-store-connect-upload.mjs"], "app store connect upload syntax"],
  ["node", ["--check", "scripts/release/write-app-store-connect-release-report.mjs"], "app store connect report syntax"],
  ["node", ["--check", "scripts/release/write-tauri-updater-manifest.mjs"], "tauri updater manifest syntax"],
  ["node", ["--check", "scripts/release/merge-tauri-updater-fragments.mjs"], "tauri updater merge syntax"],
  ["node", ["--check", "scripts/release/collect-client-github-release-assets.mjs"], "github release asset collection syntax"],
  ["node", ["--check", "scripts/release/write-mobile-release-boundary.mjs"], "mobile release boundary syntax"],
  ["node", ["--check", "scripts/release/check-client-build-capacity.mjs"], "client build capacity syntax"],
  ["node", ["--check", "scripts/release/with-client-build-lock.mjs"], "client build lock syntax"],
  ["node", ["--check", "scripts/release/cleanup-client-build-artifacts.mjs"], "client build cleanup syntax"],
  ["node", ["--check", "scripts/release/sync-client-release-state.mjs"], "client liveState sync syntax"],
  ["node", ["--check", "scripts/release/check-release-status.mjs"], "release status syntax"],
  ["node", ["--check", "scripts/release/prepare-live-state-pr.mjs"], "liveState PR preparation syntax"],
  ["node", ["--check", "scripts/release/run-release-status-ci.mjs"], "release status CI syntax"],
  ["node", ["--check", "scripts/release/run-live-state-pr-ci.mjs"], "liveState PR CI syntax"],
  ["node", ["--check", "scripts/release/check-client-release-github-prereqs.mjs"], "github prereqs syntax"],
  ["node", ["--check", "scripts/release/run-client-release-github-dry-run.mjs"], "github dry-run syntax"],
  ["node", ["scripts/release/check-client-release-surface.mjs"], "client release surface gate"],
  ["node", ["--test", "tests/client-build-lock.test.mjs"], "client build lock tests"],
  ["node", ["--test", "tests/client-release-context.test.mjs"], "client release context tests"],
  ["node", ["--test", "tests/client-release-state.test.mjs"], "client release state tests"],
  ["node", ["--test", "tests/release-status-contract.test.mjs"], "release status contract tests"],
  ["node", ["--test", "tests/release-status.test.mjs"], "release status tests"],
  ["node", ["--test", "tests/live-state-pr.test.mjs"], "liveState PR tests"],
  ["node", ["--test", "tests/release-status-ci.test.mjs"], "release status CI tests"],
  ["node", ["--test", "tests/live-state-pr-ci.test.mjs"], "liveState PR CI tests"],
  ["node", ["--test", "tests/sync-live-state-workflow.test.mjs"], "sync liveState workflow tests"],
  ["node", ["--test", "tests/client-release-github-prereqs.test.mjs"], "github prereqs tests"],
  ["node", ["--test", "tests/tauri-remote-web-url.test.mjs"], "tauri remote web url tests"],
  ["node", ["--test", "tests/admin-client-release-policy-action.test.mjs"], "admin policy action tests"],
  ["node", ["--test", "tests/android-gradle-prime.test.mjs"], "android gradle prime tests"],
];

function run(command, args, label) {
  console.log(`[client-release-check] ${label}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

for (const [command, args, label] of checks) {
  run(command, args, label);
}

console.log("[client-release-check] 客户端发布链路校验通过");
