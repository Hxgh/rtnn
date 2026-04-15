import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readEnvFile, resolveTemplateEnv, TEMPLATE_ENV_FILE } from "./lib/template-env.mjs";

const rootDir = process.cwd();

const TEXT_FILE_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);

const TEXT_FILE_BASENAMES = new Set(["Dockerfile", "README.md"]);
const SKIP_DIRECTORY_NAMES = new Set([
  ".git",
  ".next",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
]);

const TEXT_SCAN_ROOTS = [
  "apps",
  "docs",
  "packages",
  "scripts",
  "tests",
  "tooling",
];

const ROOT_TEXT_FILES = ["README.md"];

function parseArgs(argv) {
  const options = {
    dryRun: false,
    help: false,
    overrides: {},
    packageScope: undefined,
  };

  const valueFlags = new Map([
    ["--project-id", "TEMPLATE_PROJECT_ID"],
    ["--brand-name", "TEMPLATE_BRAND_NAME"],
    ["--package-scope", "packageScope"],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
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

    if (key === "packageScope") {
      options.packageScope = normalizePackageScope(nextValue);
      continue;
    }

    options.overrides[key] = nextValue.trim();
  }

  return options;
}

function printHelp() {
  console.log(`用法:
  node scripts/rewrite-template-source.mjs [options]

选项:
  --project-id <value>     指定根 package name，默认读取根级 .env 的 TEMPLATE_PROJECT_ID
  --package-scope <value>  指定 workspace package scope，默认读取 TEMPLATE_PACKAGE_SCOPE 或回退 projectId
  --brand-name <value>     指定模板品牌名，用于仓库元数据
  --dry-run                只输出将要修改的文件，不落盘
  --help                   显示帮助

执行后建议重新运行:
  pnpm install
  pnpm run contracts:permissions
  pnpm run contracts:sync
`);
}

function normalizePackageScope(value) {
  return value.trim().replace(/^@/, "");
}

function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readJson(relativePath) {
  const filePath = path.join(rootDir, relativePath);
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(relativePath, payload, dryRun, changes, reason) {
  const nextContent = `${JSON.stringify(payload, null, 2)}\n`;
  writeText(relativePath, nextContent, dryRun, changes, reason);
}

function writeText(relativePath, nextContent, dryRun, changes, reason) {
  const filePath = path.join(rootDir, relativePath);
  const previous = readFileSync(filePath, "utf8");
  if (previous === nextContent) {
    return;
  }

  changes.push({ path: relativePath, reason });
  if (!dryRun) {
    writeFileSync(filePath, nextContent);
  }
}

function rewriteDependencyMap(record, currentScope, targetScope) {
  if (!record) {
    return record;
  }

  const output = {};
  for (const [name, value] of Object.entries(record)) {
    const nextName = name.startsWith(`@${currentScope}/`)
      ? `@${targetScope}/${name.slice(currentScope.length + 2)}`
      : name;
    output[nextName] = value;
  }

  return output;
}

function rewriteScopeInText(value, currentScope, targetScope) {
  if (typeof value !== "string") {
    return value;
  }

  return value.replaceAll(`@${currentScope}/`, `@${targetScope}/`);
}

function updatePackageJson(relativePath, updater, dryRun, changes) {
  const payload = readJson(relativePath);
  const nextPayload = updater(payload);

  if (JSON.stringify(payload) === JSON.stringify(nextPayload)) {
    return;
  }

  writeJson(relativePath, nextPayload, dryRun, changes, "update package metadata");
}

function detectCurrentPackageScope() {
  const packageJson = readJson("packages/config/package.json");
  const match = /^@([^/]+)\/config$/.exec(packageJson.name ?? "");
  if (!match) {
    throw new Error("无法从 packages/config/package.json 推断当前 package scope");
  }

  return match[1];
}

function collectTextFiles(relativeDir, output = []) {
  const absoluteDir = path.join(rootDir, relativeDir);
  if (!existsSync(absoluteDir)) {
    return output;
  }

  for (const entry of readdirSync(absoluteDir)) {
    if (SKIP_DIRECTORY_NAMES.has(entry)) {
      continue;
    }

    const relativePath = path.join(relativeDir, entry);
    const absolutePath = path.join(rootDir, relativePath);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      collectTextFiles(relativePath, output);
      continue;
    }

    if (!stats.isFile()) {
      continue;
    }

    if (
      relativePath === "apps/backend/openapi.json" ||
      relativePath === "packages/api-sdk/src/generated/openapi.ts"
    ) {
      continue;
    }

    const extension = path.extname(entry);
    if (!TEXT_FILE_EXTENSIONS.has(extension) && !TEXT_FILE_BASENAMES.has(entry)) {
      continue;
    }

    output.push(relativePath);
  }

  return output;
}

function rewriteTextFile(relativePath, currentScope, targetScope, dryRun, changes) {
  const filePath = path.join(rootDir, relativePath);
  const previous = readFileSync(filePath, "utf8");

  let next = previous.replaceAll(`@${currentScope}/`, `@${targetScope}/`);

  if (relativePath.endsWith(".md") || path.basename(relativePath) === "README.md") {
    const standaloneScopePattern = new RegExp(`@${escapeForRegExp(currentScope)}\\b`, "g");
    next = next.replace(standaloneScopePattern, `@${targetScope}`);
  }

  if (next === previous) {
    return;
  }

  changes.push({ path: relativePath, reason: "rewrite package scope references" });
  if (!dryRun) {
    writeFileSync(filePath, next);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const rootEnv = readEnvFile(path.join(rootDir, TEMPLATE_ENV_FILE));
  const templateEnv = resolveTemplateEnv(rootDir, options.overrides);
  const projectId = templateEnv.TEMPLATE_PROJECT_ID;
  const brandName = templateEnv.TEMPLATE_BRAND_NAME;
  const targetScope = normalizePackageScope(
    options.packageScope ?? rootEnv.TEMPLATE_PACKAGE_SCOPE ?? projectId,
  );
  const currentScope = detectCurrentPackageScope();

  const changes = [];

  updatePackageJson(
    "package.json",
    (payload) => {
      const scripts = {
        ...Object.fromEntries(
          Object.entries(payload.scripts ?? {}).map(([name, value]) => [
            name,
            rewriteScopeInText(value, currentScope, targetScope),
          ]),
        ),
        "template:rewrite-source": "node scripts/rewrite-template-source.mjs",
      };

      return {
        ...payload,
        name: projectId,
        scripts,
      };
    },
    options.dryRun,
    changes,
  );

  updatePackageJson(
    "apps/backend/package.json",
    (payload) => ({
      ...payload,
      description: `${projectId} backend template kernel`,
      author: brandName,
      dependencies: rewriteDependencyMap(payload.dependencies, currentScope, targetScope),
    }),
    options.dryRun,
    changes,
  );

  for (const relativePath of [
    "apps/admin/package.json",
    "apps/app/package.json",
    "apps/weapp/package.json",
    "packages/api-sdk/package.json",
    "packages/config/package.json",
    "packages/shared-schemas/package.json",
    "packages/shared-types/package.json",
  ]) {
    updatePackageJson(
      relativePath,
      (payload) => ({
        ...payload,
        name:
          typeof payload.name === "string" && payload.name.startsWith(`@${currentScope}/`)
            ? `@${targetScope}/${payload.name.slice(currentScope.length + 2)}`
            : payload.name,
        dependencies: rewriteDependencyMap(payload.dependencies, currentScope, targetScope),
        devDependencies: rewriteDependencyMap(payload.devDependencies, currentScope, targetScope),
        peerDependencies: rewriteDependencyMap(payload.peerDependencies, currentScope, targetScope),
        optionalDependencies: rewriteDependencyMap(
          payload.optionalDependencies,
          currentScope,
          targetScope,
        ),
      }),
      options.dryRun,
      changes,
    );
  }

  const textFiles = new Set(ROOT_TEXT_FILES);
  for (const relativeDir of TEXT_SCAN_ROOTS) {
    for (const file of collectTextFiles(relativeDir)) {
      textFiles.add(file);
    }
  }

  for (const relativePath of [...textFiles].sort()) {
    rewriteTextFile(relativePath, currentScope, targetScope, options.dryRun, changes);
  }

  if (changes.length === 0) {
    console.log(
      `no changes (projectId=${projectId}, packageScope=@${targetScope}, brandName=${brandName})`,
    );
    return;
  }

  console.log(
    `${options.dryRun ? "dry-run" : "updated"} ${changes.length} file(s):`,
  );
  for (const change of changes) {
    console.log(`- ${change.path} (${change.reason})`);
  }

  if (options.dryRun) {
    console.log("dry-run complete; no files were written.");
  } else {
    console.log("source rewrite complete. Run pnpm install, then refresh contracts if needed.");
  }
}

main();
