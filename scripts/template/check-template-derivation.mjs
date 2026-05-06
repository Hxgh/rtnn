import { spawnSync } from "node:child_process";

function run(command, args, label) {
  console.log(`[template-derivation-check] ${label}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runExpectFailure(command, args, label) {
  console.log(`[template-derivation-check] ${label}`);
  const result = spawnSync(command, args, {
    stdio: "pipe",
    shell: false,
    encoding: "utf8",
  });

  if (result.status === 0) {
    throw new Error(`${label} 未按预期失败`);
  }
}

function main() {
  run(
    "node",
    ["scripts/template/check-template-neutrality.mjs"],
    "检查模板中立性与业务事实污染",
  );

  run(
    "node",
    [
      "scripts/template/init-template.mjs",
      "--project-id=acme",
      "--brand-name=ACME",
      "--rewrite-source",
      "--package-scope=acme",
      "--dry-run",
    ],
    "验证业务源码仓派生入口 dry-run",
  );

  run("node", ["--check", "scripts/bootstrap/setup-env.mjs"], "校验模板环境脚本语法");
  run("node", ["--check", "scripts/template/check-template-neutrality.mjs"], "校验模板中立性脚本语法");
  run("node", ["--check", "scripts/template/rewrite-template-source.mjs"], "校验源码改写脚本语法");
  run("node", ["--check", "scripts/lib/project-profile.mjs"], "校验 project profile 脚本语法");
  run("node", ["--check", "scripts/client/check-tauri-clients.mjs"], "校验 Tauri client 检查脚本语法");
  run("node", ["--check", "scripts/runtime/run-profiled-task.mjs"], "校验 profile task 脚本语法");
  run("node", ["--check", "scripts/release/resolve-release-context.mjs"], "校验 release context 脚本语法");
  run("node", ["--check", "scripts/release/resolve-client-release-context.mjs"], "校验 client release context 脚本语法");
  run("node", ["--check", "scripts/release/write-client-release-manifest.mjs"], "校验 client release manifest 脚本语法");
  run("node", ["--check", "scripts/release/collect-client-artifacts.mjs"], "校验 client release artifact 脚本语法");
  run("node", ["--check", "scripts/release/prepare-tauri-updater-signing.mjs"], "校验 Tauri updater signing 准备脚本语法");
  run("node", ["--check", "scripts/release/prepare-android-signing.mjs"], "校验 Android signing 准备脚本语法");
  run("node", ["--check", "scripts/release/prepare-google-play-upload.mjs"], "校验 Google Play upload 准备脚本语法");
  run("node", ["--check", "scripts/release/write-google-play-release-report.mjs"], "校验 Google Play release report 脚本语法");
  run("node", ["--check", "scripts/release/prepare-ios-signing.mjs"], "校验 iOS signing 准备脚本语法");
  run("node", ["--check", "scripts/release/prepare-app-store-connect-upload.mjs"], "校验 App Store Connect upload 准备脚本语法");
  run("node", ["--check", "scripts/release/write-app-store-connect-release-report.mjs"], "校验 App Store Connect release report 脚本语法");
  run("node", ["--check", "scripts/release/write-tauri-updater-manifest.mjs"], "校验 Tauri updater manifest 脚本语法");
  run("node", ["--check", "scripts/release/merge-tauri-updater-fragments.mjs"], "校验 Tauri updater merge 脚本语法");
  run("node", ["--check", "scripts/release/collect-client-github-release-assets.mjs"], "校验 client GitHub Release asset 收集脚本语法");
  run("node", ["--check", "scripts/release/write-mobile-release-boundary.mjs"], "校验 mobile release boundary 脚本语法");
  run("node", ["--check", "scripts/release/sync-client-release-state.mjs"], "校验 client liveState 同步脚本语法");
  run("node", ["--check", "scripts/release/check-client-release-github-prereqs.mjs"], "校验 client release GitHub 前置条件脚本语法");
  run("node", ["--check", "scripts/release/run-client-release-github-dry-run.mjs"], "校验 client release GitHub dry-run 触发脚本语法");
  run("node", ["--check", "scripts/release/sync-live-state.mjs"], "校验 liveState 同步脚本语法");
  run("node", ["--check", "scripts/release/detect-live-state-only-change.mjs"], "校验 liveState-only 变更检测脚本语法");
  run("node", ["--test", "tests/project-profile.test.mjs"], "运行 project profile 测试");
  run("pnpm", ["run", "check:native-bridge"], "运行 native bridge 测试");
  run("node", ["--test", "tests/client-release-context.test.mjs"], "运行 client release context 测试");
  run("node", ["--test", "tests/client-release-state.test.mjs"], "运行 client release state 测试");
  run("node", ["--test", "tests/client-release-github-prereqs.test.mjs"], "运行 client release GitHub 前置条件测试");
  run("node", ["--test", "tests/live-state-only-change.test.mjs"], "运行 liveState-only 变更检测测试");
  run("node", ["scripts/client/check-tauri-clients.mjs"], "验证 Tauri client 壳骨架");
  run(
    "node",
    ["scripts/template/sync-project-metadata.mjs", "--dry-run"],
    "验证业务仓项目事实文件生成入口",
  );

  runExpectFailure(
    "node",
    ["scripts/template/init-template.mjs", "--instance-dir=../acme-demo"],
    "确认旧薄实例参数已下线",
  );

  console.log("[template-derivation-check] 模板派生校验通过");
}

main();
