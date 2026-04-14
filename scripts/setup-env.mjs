import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  TEMPLATE_ENV_EXAMPLE_FILE,
  TEMPLATE_ENV_FILE,
  renderTemplate,
  resolveTemplateEnv,
  writeTemplateEnvFile,
} from "./lib/template-env.mjs";

const rootDir = process.cwd();

const files = [
  [".env.example", ".env"],
  ["backend/.env.example", "backend/.env"],
  ["admin/.env.example", "admin/.env.local"],
  ["app/.env.example", "app/.env.local"],
  ["weapp/.env.example", "weapp/.env"],
];

function parseArgs(argv) {
  const options = {
    force: false,
    overrides: {},
  };

  const mappings = new Map([
    ["--project-id", "TEMPLATE_PROJECT_ID"],
    ["--brand-name", "TEMPLATE_BRAND_NAME"],
    ["--cookie-prefix", "TEMPLATE_COOKIE_PREFIX"],
    ["--database-name", "TEMPLATE_DATABASE_NAME"],
    ["--database-port", "TEMPLATE_DATABASE_PORT"],
    ["--backend-port", "TEMPLATE_BACKEND_PORT"],
    ["--admin-port", "TEMPLATE_ADMIN_PORT"],
    ["--app-port", "TEMPLATE_APP_PORT"],
    ["--weapp-port", "TEMPLATE_WEAPP_H5_PORT"],
    ["--image-prefix", "TEMPLATE_IMAGE_NAME_PREFIX"],
    ["--deploy-application", "TEMPLATE_DEPLOY_APPLICATION"],
    ["--deploy-event-type", "TEMPLATE_DEPLOY_EVENT_TYPE"],
    ["--admin-email", "TEMPLATE_ADMIN_EMAIL"],
    ["--customer-email", "TEMPLATE_CUSTOMER_EMAIL"],
  ]);

  for (const arg of argv) {
    if (arg === "--force") {
      options.force = true;
      continue;
    }

    const [flag, rawValue] = arg.split("=", 2);
    const key = mappings.get(flag);
    if (!key) {
      continue;
    }

    if (!rawValue) {
      throw new Error(`${flag} 缺少值，请使用 ${flag}=value`);
    }

    options.overrides[key] = rawValue;
  }

  return options;
}

function ensureRootTemplateEnv(templateEnv, force) {
  const rootEnvPath = path.join(rootDir, TEMPLATE_ENV_FILE);
  const rootEnvExamplePath = path.join(rootDir, TEMPLATE_ENV_EXAMPLE_FILE);
  const shouldWrite = force || !existsSync(rootEnvPath);

  if (!existsSync(rootEnvExamplePath)) {
    writeTemplateEnvFile(rootEnvExamplePath, templateEnv);
    console.log(`create ${TEMPLATE_ENV_EXAMPLE_FILE}`);
  }

  if (!shouldWrite) {
    console.log(`skip ${TEMPLATE_ENV_FILE} (already exists)`);
    return;
  }

  writeTemplateEnvFile(rootEnvPath, templateEnv);
  console.log(`create ${TEMPLATE_ENV_FILE}`);
}

function renderManagedEnv(sourceRelative, targetRelative, templateEnv, force) {
  const source = path.join(rootDir, sourceRelative);
  const target = path.join(rootDir, targetRelative);
  const existedBefore = existsSync(target);

  if (sourceRelative === ".env.example") {
    return;
  }

  if (!force && existedBefore) {
    console.log(`skip ${targetRelative} (already exists)`);
    return;
  }

  const rendered = renderTemplate(readFileSync(source, "utf8"), templateEnv);
  writeFileSync(target, rendered);
  console.log(`${existedBefore ? "update" : "create"} ${targetRelative}`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const templateEnv = resolveTemplateEnv(rootDir, options.overrides);
  const shouldRewriteManagedFiles =
    options.force || Object.keys(options.overrides).length > 0;

  ensureRootTemplateEnv(templateEnv, shouldRewriteManagedFiles);

  for (const [sourceRelative, targetRelative] of files) {
    renderManagedEnv(
      sourceRelative,
      targetRelative,
      templateEnv,
      shouldRewriteManagedFiles,
    );
  }
}

main();
