import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

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

function main() {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "rtnn-template-derivation-"));
  const instanceDir = path.join(tempRoot, "acme-demo");
  const templateRepoDir = path.join(tempRoot, "acme");
  const deployRepoDir = path.join(tempRoot, "acme-deploy");

  try {
    run(
      "node",
      [
        "scripts/template/init-template.mjs",
        "--project-id=acme",
        "--brand-name=ACME",
        "--rewrite-source",
        "--package-scope=acme",
        `--instance-dir=${instanceDir}`,
        "--instance-repo=example/acme-demo",
        "--template-repo=example/acme",
        "--deploy-repo=example/acme-deploy",
        "--base-domain=acme.example.com",
        "--dry-run",
      ],
      "验证统一派生入口 dry-run",
    );

    run(
      "node",
      [
        "scripts/template/scaffold-instance-repo.mjs",
        `--target-dir=${instanceDir}`,
        "--project-id=acme",
        "--brand-name=ACME",
        "--instance-repo=example/acme-demo",
        "--template-repo=example/acme",
        "--deploy-repo=example/acme-deploy",
        "--base-domain=acme.example.com",
      ],
      "生成临时实例目录脚手架",
    );

    const instanceJsonPath = path.join(instanceDir, ".rtnn", "instance.json");
    const acceptancePath = path.join(instanceDir, ".rtnn", "acceptance.md");
    const readmePath = path.join(instanceDir, "README.md");
    const syncScriptPath = path.join(instanceDir, "scripts", "sync-from-template.sh");
    const runtimeScriptPath = path.join(instanceDir, "scripts", "render-runtime-env.mjs");
    const testingRuntimeEnvPath = path.join(tempRoot, "testing.runtime.env");
    const productionRuntimeEnvPath = path.join(tempRoot, "production.runtime.env");

    assert(existsSync(instanceJsonPath), "缺少 .rtnn/instance.json");
    assert(existsSync(acceptancePath), "缺少 .rtnn/acceptance.md");
    assert(existsSync(readmePath), "缺少 README.md");
    assert(existsSync(syncScriptPath), "缺少 scripts/sync-from-template.sh");
    assert(existsSync(runtimeScriptPath), "缺少 scripts/render-runtime-env.mjs");

    run("bash", ["-n", syncScriptPath], "校验实例同步脚本语法");
    run("node", ["--check", runtimeScriptPath], "校验实例 env 渲染脚本语法");

    mkdirSync(templateRepoDir, { recursive: true });
    mkdirSync(path.join(deployRepoDir, "scripts", "ops"), { recursive: true });
    writeFileSync(path.join(templateRepoDir, ".env"), readFileSync(path.join(rootDir, ".env.example"), "utf8"));
    writeFileSync(
      path.join(deployRepoDir, "scripts", "ops", "render-runtime-env.sh"),
      `#!/usr/bin/env bash
set -euo pipefail

OUTPUT=""
ENVIRONMENT=""
DATABASE_URL=""
PUBLIC_ADMIN_BASE_URL=""
JWT_ACCESS_SECRET=""
JWT_REFRESH_SECRET=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output)
      OUTPUT="$2"
      shift 2
      ;;
    --environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --database-url)
      DATABASE_URL="$2"
      shift 2
      ;;
    --public-admin-base-url)
      PUBLIC_ADMIN_BASE_URL="$2"
      shift 2
      ;;
    --jwt-access-secret)
      JWT_ACCESS_SECRET="$2"
      shift 2
      ;;
    --jwt-refresh-secret)
      JWT_REFRESH_SECRET="$2"
      shift 2
      ;;
    *)
      shift 2
      ;;
  esac
done

mkdir -p "$(dirname "$OUTPUT")"
cat >"$OUTPUT" <<EOF
DEPLOY_ENVIRONMENT="$ENVIRONMENT"
DATABASE_URL="$DATABASE_URL"
PUBLIC_ADMIN_BASE_URL="$PUBLIC_ADMIN_BASE_URL"
JWT_ACCESS_SECRET="$JWT_ACCESS_SECRET"
JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
EOF
`,
    );
    chmodSync(path.join(deployRepoDir, "scripts", "ops", "render-runtime-env.sh"), 0o755);

    run(
      "node",
      [runtimeScriptPath, "--environment", "testing", "--output", testingRuntimeEnvPath],
      "执行实例 testing env 渲染",
    );
    run(
      "node",
      [runtimeScriptPath, "--environment", "production", "--output", productionRuntimeEnvPath],
      "执行实例 production env 渲染",
    );

    const instance = JSON.parse(readFileSync(instanceJsonPath, "utf8"));
    const testingRuntimeEnv = readFileSync(testingRuntimeEnvPath, "utf8");
    const productionRuntimeEnv = readFileSync(productionRuntimeEnvPath, "utf8");
    assert(
      instance.identity?.templateProjectId === "acme",
      "instance.json 未写入正确的 projectId",
    );
    assert(
      instance.repositories?.template?.repo === "example/acme",
      "instance.json 未写入正确的 template repo",
    );
    assert(
      instance.repositories?.deploy?.repo === "example/acme-deploy",
      "instance.json 未写入正确的 deploy repo",
    );
    assert(
      instance.domains?.production?.root === "acme.example.com",
      "instance.json 未写入正确的生产域名",
    );
    assert(
      instance.server?.sharedInfra?.network?.ingressAliasMode === "environment-scoped",
      "instance.json 缺少环境级 ingress alias 约束",
    );
    assert(
      testingRuntimeEnv.includes('PUBLIC_ADMIN_BASE_URL="https://admin.testing.acme.example.com"'),
      "testing runtime env 未写入正确的 admin 域名",
    );
    assert(
      testingRuntimeEnv.includes('DATABASE_URL="postgresql://acme_testing:postgres@standalone-postgres:5432/acme_testing?schema=public"'),
      "testing runtime env 未写入正确的数据库连接",
    );
    assert(
      productionRuntimeEnv.includes('PUBLIC_ADMIN_BASE_URL="https://admin.acme.example.com"'),
      "production runtime env 未写入正确的 admin 域名",
    );
    assert(
      productionRuntimeEnv.includes('JWT_ACCESS_SECRET="replace-this-with-a-long-random-string-access"'),
      "production runtime env 未继承模板 JWT access secret 默认值",
    );

    console.log("[template-derivation-check] 模板派生校验通过");
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

main();
