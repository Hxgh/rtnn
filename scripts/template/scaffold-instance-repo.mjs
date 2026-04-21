import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolveTemplateEnv } from "../lib/template-env.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const templateDir = path.join(rootDir, "templates", "instance");

function parseArgs(argv) {
  const options = {
    dryRun: false,
    force: false,
    help: false,
    overrides: {},
    targetDir: "",
    instanceRepo: "",
    templateRepo: "",
    deployRepo: "",
    baseDomain: "",
    instancePurpose: "private-instance-acceptance",
    instanceOwnership: "local-or-private-only",
  };

  const valueFlags = new Map([
    ["--target-dir", "targetDir"],
    ["--instance-dir", "targetDir"],
    ["--instance-repo", "instanceRepo"],
    ["--template-repo", "templateRepo"],
    ["--deploy-repo", "deployRepo"],
    ["--base-domain", "baseDomain"],
    ["--instance-purpose", "instancePurpose"],
    ["--instance-ownership", "instanceOwnership"],
    ["--project-id", "TEMPLATE_PROJECT_ID"],
    ["--brand-name", "TEMPLATE_BRAND_NAME"],
    ["--cookie-prefix", "TEMPLATE_COOKIE_PREFIX"],
    ["--image-prefix", "TEMPLATE_IMAGE_NAME_PREFIX"],
    ["--deploy-application", "TEMPLATE_DEPLOY_APPLICATION"],
    ["--deploy-event-type", "TEMPLATE_DEPLOY_EVENT_TYPE"],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--force") {
      options.force = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    const [flag, inlineValue] = arg.split("=", 2);
    const key = valueFlags.get(flag);
    if (!key) {
      throw new Error(`未知参数: ${arg}`);
    }

    const nextValue = inlineValue ?? argv[index + 1];
    if (!nextValue || nextValue.startsWith("--")) {
      throw new Error(`${flag} 缺少值`);
    }

    if (inlineValue == null) {
      index += 1;
    }

    if (key.startsWith("TEMPLATE_")) {
      options.overrides[key] = nextValue.trim();
      continue;
    }

    options[key] = nextValue.trim();
  }

  return options;
}

function printHelp() {
  console.log(`用法:
  node scripts/template/scaffold-instance-repo.mjs [options]

选项:
  --target-dir <path>        指定实例目录输出路径，默认 ../<projectId>-demo
  --instance-repo <owner/repo>
                             指定实例仓库名，默认 <template-owner>/<projectId>-demo
  --template-repo <owner/repo>
                             指定模板仓库名，默认读取当前 origin
  --deploy-repo <owner/repo> 指定部署仓库名，默认 <template-owner>/<projectId>-deploy
  --base-domain <domain>     指定实例基础域名，默认 <projectId>.example.com
  --project-id <value>       覆盖模板 project id
  --brand-name <value>       覆盖模板品牌名
  --cookie-prefix <value>    覆盖 cookie 前缀
  --image-prefix <value>     覆盖镜像前缀
  --deploy-application <v>   覆盖 deploy 应用名
  --deploy-event-type <v>    覆盖 deploy event type
  --force                    覆盖已存在文件
  --dry-run                  只输出计划，不落盘
  --help                     显示帮助
`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function detectOriginRepo() {
  const result = spawnSync("git", ["remote", "get-url", "origin"], {
    cwd: rootDir,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    return "";
  }

  return normalizeRepo(result.stdout.trim());
}

function normalizeRepo(value) {
  const trimmed = value.trim().replace(/\.git$/, "");

  if (trimmed.startsWith("https://github.com/")) {
    return trimmed.slice("https://github.com/".length);
  }

  if (trimmed.startsWith("git@github.com:")) {
    return trimmed.slice("git@github.com:".length);
  }

  return trimmed.replace(/^\/+/, "");
}

function getOwner(repo) {
  const [owner] = repo.split("/");
  return owner || "example";
}

function getRepoName(repo) {
  const parts = repo.split("/");
  return parts[parts.length - 1] || repo;
}

function buildContext(options) {
  const templateEnv = resolveTemplateEnv(rootDir, options.overrides);
  const projectId = templateEnv.TEMPLATE_PROJECT_ID;
  const originRepo = detectOriginRepo();
  const templateRepo = options.templateRepo || originRepo || `example/${projectId}`;
  const owner = getOwner(templateRepo);
  const instanceRepo = options.instanceRepo || `${owner}/${projectId}-demo`;
  const deployRepo = options.deployRepo || `${owner}/${projectId}-deploy`;
  const baseDomain = options.baseDomain || `${projectId}.example.com`;
  const targetDir =
    options.targetDir || path.resolve(rootDir, "..", `${projectId}-demo`);
  const projectEnvPrefix = projectId.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();

  return {
    TARGET_DIR: targetDir,
    INSTANCE_REPO: instanceRepo,
    TEMPLATE_REPO: templateRepo,
    DEPLOY_REPO: deployRepo,
    PROJECT_ID: projectId,
    BRAND_NAME: templateEnv.TEMPLATE_BRAND_NAME,
    COOKIE_PREFIX: templateEnv.TEMPLATE_COOKIE_PREFIX,
    IMAGE_PREFIX: templateEnv.TEMPLATE_IMAGE_NAME_PREFIX,
    DEPLOY_APPLICATION: templateEnv.TEMPLATE_DEPLOY_APPLICATION,
    DEPLOY_EVENT_TYPE: templateEnv.TEMPLATE_DEPLOY_EVENT_TYPE,
    BASE_DOMAIN: baseDomain,
    TESTING_ROOT: `testing.${baseDomain}`,
    TESTING_API: `api.testing.${baseDomain}`,
    TESTING_ADMIN: `admin.testing.${baseDomain}`,
    TESTING_APP: `app.testing.${baseDomain}`,
    TESTING_WEAPP: `weapp.testing.${baseDomain}`,
    PRODUCTION_ROOT: baseDomain,
    PRODUCTION_API: `api.${baseDomain}`,
    PRODUCTION_ADMIN: `admin.${baseDomain}`,
    PRODUCTION_APP: `app.${baseDomain}`,
    PRODUCTION_WEAPP: `weapp.${baseDomain}`,
    ROOT_PATH: `/home/${projectId}`,
    RUNNER_SERVICE_NAME: `${projectId}-deploy-runner.service`,
    INSTANCE_PURPOSE: options.instancePurpose,
    INSTANCE_OWNERSHIP: options.instanceOwnership,
    PROJECT_ENV_PREFIX: projectEnvPrefix,
    TEMPLATE_REPO_NAME: getRepoName(templateRepo),
    DEPLOY_REPO_NAME: getRepoName(deployRepo),
    INSTANCE_REPO_NAME: getRepoName(instanceRepo),
  };
}

function renderTemplate(content, context) {
  return content.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_full, key) => {
    return context[key] ?? "";
  });
}

function collectTemplateFiles(currentDir, relativeDir = "", output = []) {
  const directory = path.join(currentDir, relativeDir);

  for (const entry of readdirSync(directory)) {
    const entryRelativePath = path.join(relativeDir, entry);
    const absolutePath = path.join(currentDir, entryRelativePath);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      collectTemplateFiles(currentDir, entryRelativePath, output);
      continue;
    }

    output.push(entryRelativePath);
  }

  return output;
}

function ensureDirectory(directoryPath, dryRun) {
  if (dryRun) {
    return;
  }

  mkdirSync(directoryPath, { recursive: true });
}

function writeRenderedFile(targetFilePath, content, dryRun, force) {
  if (existsSync(targetFilePath) && !force) {
    throw new Error(`目标文件已存在，请先清理或追加 --force: ${targetFilePath}`);
  }

  ensureDirectory(path.dirname(targetFilePath), dryRun);

  if (dryRun) {
    return;
  }

  writeFileSync(targetFilePath, content);
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  assert(existsSync(templateDir), `缺少实例模板目录: ${templateDir}`);

  const context = buildContext(options);
  const templateFiles = collectTemplateFiles(templateDir);

  console.log(`[instance-scaffold] target=${context.TARGET_DIR}`);
  console.log(`[instance-scaffold] template=${context.TEMPLATE_REPO}`);
  console.log(`[instance-scaffold] deploy=${context.DEPLOY_REPO}`);
  console.log(`[instance-scaffold] instance=${context.INSTANCE_REPO}`);
  console.log(`[instance-scaffold] base_domain=${context.BASE_DOMAIN}`);

  for (const relativeTemplatePath of templateFiles) {
    const sourcePath = path.join(templateDir, relativeTemplatePath);
    const renderedContent = renderTemplate(
      readFileSync(sourcePath, "utf8"),
      context,
    );
    const targetRelativePath = relativeTemplatePath.replace(/\.tmpl$/, "");
    const targetPath = path.join(context.TARGET_DIR, targetRelativePath);

    console.log(
      `[instance-scaffold] ${options.dryRun ? "plan" : "write"} ${targetRelativePath}`,
    );
    writeRenderedFile(targetPath, renderedContent, options.dryRun, options.force);

    if (!options.dryRun && targetRelativePath.endsWith(".sh")) {
      chmodSync(targetPath, 0o755);
    }
  }

  if (options.dryRun) {
    console.log("[instance-scaffold] dry-run 完成，未写入文件");
    return;
  }

  console.log("[instance-scaffold] 实例目录脚手架生成完成");
  console.log("[instance-scaffold] 建议后续执行：");
  console.log(`  1. cd ${context.TARGET_DIR}`);
  console.log("  2. git init");
  console.log("  3. 检查 .rtnn/instance.json 并补全服务器实际值");
  console.log("  4. node scripts/render-runtime-env.mjs --environment testing");
}

main();
