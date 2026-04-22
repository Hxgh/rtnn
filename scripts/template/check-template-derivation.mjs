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
  run("node", ["--check", "scripts/template/rewrite-template-source.mjs"], "校验源码改写脚本语法");
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
