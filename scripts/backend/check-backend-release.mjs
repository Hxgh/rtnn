import { spawnSync } from "node:child_process";

const steps = [
  {
    label: "生成模板环境",
    command: "pnpm",
    args: ["run", "setup:env"],
    nextAction: "检查根目录 .env / .env.example 是否可写且模板参数合法。",
  },
  {
    label: "确保 PostgreSQL 可用",
    command: "pnpm",
    args: ["run", "postgres:up"],
    nextAction:
      "如果使用本地数据库，请确认 Docker 可用；如果使用外部数据库，请确认 DATABASE_URL 可连接。",
  },
  {
    label: "准备 backend 依赖与 Prisma Client",
    command: "pnpm",
    args: ["run", "prepare:backend"],
    nextAction: "检查共享包构建、Prisma schema 与 DATABASE_URL 配置。",
  },
  {
    label: "预检测试 schema 残留",
    command: "pnpm",
    args: ["run", "check:backend-test-schemas"],
    nextAction:
      "确认残留 schema 不含需要保留的数据；需要清理时执行 pnpm run check:backend-test-schemas -- --prune。",
  },
  {
    label: "执行 backend 发布基线",
    command: "pnpm",
    args: ["--filter", "backend", "check:release"],
    nextAction:
      "根据上方失败阶段分别修复权限生成、OpenAPI 导出、类型检查或 backend 单元/integration/e2e 测试。",
  },
  {
    label: "验证 integration/e2e 并行隔离",
    command: "pnpm",
    args: ["run", "check:backend-tests-parallel"],
    nextAction:
      "检查测试 schema 派生、测试 harness 清理逻辑，以及是否有并行进程共享 TEST_DATABASE_SCHEMA。",
  },
  {
    label: "审计测试 schema 残留",
    command: "pnpm",
    args: ["run", "check:backend-test-schemas"],
    nextAction:
      "确认测试进程是否异常退出；需要清理时执行 pnpm run check:backend-test-schemas -- --prune。",
  },
];

function runStep(step) {
  console.log(`[backend-release-check] ${step.label}`);
  const result = spawnSync(step.command, step.args, {
    stdio: "inherit",
    shell: false,
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(`\n[backend-release-check] 失败阶段：${step.label}`);
    console.error(`[backend-release-check] 建议下一步：${step.nextAction}\n`);
    process.exit(result.status ?? 1);
  }
}

for (const step of steps) {
  runStep(step);
}

console.log("[backend-release-check] backend 发布门禁通过");
