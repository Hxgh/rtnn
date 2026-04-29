#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const REQUIRED_SOURCE_SECRETS = Object.freeze([
  "DEPLOY_REPOSITORY_DISPATCH_TOKEN",
]);
const REQUIRED_DEPLOY_SECRETS = Object.freeze([
  "DEPLOY_SOURCE_REPOSITORY_TOKEN",
]);
const OPTIONAL_SOURCE_VARIABLES = Object.freeze([
  "CLIENT_RELEASE_SYNC_DEPLOY_FACTS",
]);

function usage() {
  return `用法:
  node scripts/release/check-client-release-github-prereqs.mjs [--strict] [--json]

选项:
  --strict   任一必需项缺失时返回非 0
  --json     输出机器可读 JSON

说明:
  只检查 workflow、secret / variable 名称和 gh 登录状态，不读取 secret 值。
`;
}

function parseArgs(argv) {
  const args = {
    strict: false,
    json: false,
  };

  for (const item of argv) {
    switch (item) {
      case "--strict":
        args.strict = true;
        break;
      case "--json":
        args.json = true;
        break;
      case "--help":
      case "-h":
        console.log(usage());
        process.exit(0);
      default:
        throw new Error(`未知参数: ${item}`);
    }
  }

  return args;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function normalizeString(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: false,
  });

  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function commandExists(command) {
  return run("sh", ["-lc", `command -v ${command}`]).ok;
}

function gh(args) {
  return run("gh", args);
}

function parseTabularNames(stdout) {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/)[0])
    .filter(Boolean);
}

function listSecrets(repository) {
  const result = gh(["secret", "list", "--repo", repository, "--app", "actions"]);
  if (!result.ok) {
    return {
      ok: false,
      names: [],
      error: result.stderr || result.stdout,
    };
  }

  return {
    ok: true,
    names: parseTabularNames(result.stdout),
  };
}

function listVariables(repository) {
  const result = gh(["variable", "list", "--repo", repository]);
  if (!result.ok) {
    return {
      ok: false,
      names: [],
      error: result.stderr || result.stdout,
    };
  }

  return {
    ok: true,
    names: parseTabularNames(result.stdout),
  };
}

function workflowExists(repository, workflowFile) {
  const result = gh(["workflow", "view", workflowFile, "--repo", repository]);
  return {
    ok: result.ok,
    error: result.ok ? "" : result.stderr || result.stdout,
  };
}

function buildCheck(name, ok, detail = "") {
  return {
    name,
    ok,
    detail,
  };
}

function buildConfiguration(report) {
  return {
    sourceRepository: report.repositories.source || "",
    deployRepository: report.repositories.deploy || "",
    sourceWorkflow: "release-clients.yml",
    deployWorkflow: "sync-client-release-facts.yml",
    requiredSourceSecrets: REQUIRED_SOURCE_SECRETS,
    requiredDeploySecrets: REQUIRED_DEPLOY_SECRETS,
    optionalSourceVariables: OPTIONAL_SOURCE_VARIABLES,
    clientReleaseFactsEventType: report.clientReleaseFactsEventType || "",
  };
}

function buildNextActions(report) {
  const actions = [];

  if (report.blocking.includes("missing-project-metadata")) {
    actions.push("补齐业务仓 .rtnn/project.json 后重新运行本脚本。");
    return actions;
  }

  if (!report.repositories.source) {
    actions.push("在 .rtnn/project.json project.repo 中声明业务源码仓，例如 owner/repo。");
  }

  if (!report.repositories.deploy) {
    actions.push("在 .rtnn/project.json deployment.repo 中声明 deploy 仓，例如 owner/rtnn-deploy。");
  }

  if (report.blocking.includes("gh-not-installed")) {
    actions.push("安装 GitHub CLI 后重新运行本脚本。");
    return actions;
  }

  if (report.blocking.includes("gh-not-authenticated")) {
    actions.push("执行 gh auth login 登录 GitHub CLI，然后重新运行本脚本。");
    return actions;
  }

  if (report.blocking.includes("source-release-clients-workflow")) {
    actions.push(
      `将业务仓 release-clients.yml 合入并推送到 ${report.repositories.source} 默认分支，然后重新运行本脚本。`,
    );
  }

  if (report.blocking.includes("deploy-sync-client-release-facts-workflow")) {
    actions.push(
      `将 deploy 仓 sync-client-release-facts.yml 合入并推送到 ${report.repositories.deploy} 默认分支，然后重新运行本脚本。`,
    );
  }

  const sourceMissing = report.sourceSecrets?.missing ?? [];
  if (sourceMissing.length > 0) {
    actions.push(
      `在 ${report.repositories.source} Actions secrets 中配置: ${sourceMissing.join(", ")}。`,
    );
  }

  const deployMissing = report.deploySecrets?.missing ?? [];
  if (deployMissing.length > 0) {
    actions.push(
      `在 ${report.repositories.deploy} Actions secrets 中配置: ${deployMissing.join(", ")}。`,
    );
  }

  if (report.sourceVariables && !report.sourceVariables.present) {
    actions.push(
      `可选：在 ${report.repositories.source} repository variables 中配置 CLIENT_RELEASE_SYNC_DEPLOY_FACTS=true，或每次 workflow 手动传入 sync_deploy_facts=true。`,
    );
  }

  if (report.blocking.length === 0) {
    actions.push("执行 pnpm run release:clients:github-dry-run 触发 testing dry-run。");
  }

  return actions;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const metadataPath = path.join(rootDir, ".rtnn/project.json");
  const report = {
    schemaVersion: "rtnn.client-release-github-prereqs.v1",
    generatedAt: new Date().toISOString(),
    checks: [],
    repositories: {},
    blocking: [],
  };

  if (!existsSync(metadataPath)) {
    report.checks.push(buildCheck("project-metadata", false, ".rtnn/project.json 不存在"));
    report.blocking.push("missing-project-metadata");
    finish(report, args);
    return;
  }

  const metadata = readJson(metadataPath);
  const sourceRepository = normalizeString(metadata.project?.repo);
  const deployRepository = normalizeString(metadata.deployment?.repo);
  const clientReleaseFactsEventType = normalizeString(
    metadata.deployment?.clientReleaseFactsEventType,
    `sync-${normalizeString(metadata.deployment?.application, metadata.project?.projectId)}-client-release-facts`,
  );

  report.repositories.source = sourceRepository;
  report.repositories.deploy = deployRepository;
  report.clientReleaseFactsEventType = clientReleaseFactsEventType;
  report.checks.push(buildCheck("source-repository", Boolean(sourceRepository), sourceRepository || "缺少 project.repo"));
  report.checks.push(buildCheck("deploy-repository", Boolean(deployRepository), deployRepository || "缺少 deployment.repo"));
  report.checks.push(buildCheck("gh-installed", commandExists("gh"), "GitHub CLI"));

  if (!report.checks.at(-1).ok) {
    report.blocking.push("gh-not-installed");
    finish(report, args);
    return;
  }

  const auth = gh(["auth", "status"]);
  report.checks.push(buildCheck("gh-auth", auth.ok, auth.ok ? "已登录" : auth.stderr || auth.stdout));
  if (!auth.ok) {
    report.blocking.push("gh-not-authenticated");
    finish(report, args);
    return;
  }

  for (const [repository, workflowFile, label] of [
    [sourceRepository, "release-clients.yml", "source-release-clients-workflow"],
    [deployRepository, "sync-client-release-facts.yml", "deploy-sync-client-release-facts-workflow"],
  ]) {
    const workflow = workflowExists(repository, workflowFile);
    report.checks.push(buildCheck(label, workflow.ok, workflow.ok ? workflowFile : workflow.error));
    if (!workflow.ok) {
      report.blocking.push(label);
    }
  }

  const sourceSecrets = listSecrets(sourceRepository);
  const deploySecrets = listSecrets(deployRepository);
  report.sourceSecrets = {
    readable: sourceSecrets.ok,
    required: REQUIRED_SOURCE_SECRETS,
    present: REQUIRED_SOURCE_SECRETS.filter((name) => sourceSecrets.names.includes(name)),
    missing: REQUIRED_SOURCE_SECRETS.filter((name) => !sourceSecrets.names.includes(name)),
    error: sourceSecrets.error || "",
  };
  report.deploySecrets = {
    readable: deploySecrets.ok,
    required: REQUIRED_DEPLOY_SECRETS,
    present: REQUIRED_DEPLOY_SECRETS.filter((name) => deploySecrets.names.includes(name)),
    missing: REQUIRED_DEPLOY_SECRETS.filter((name) => !deploySecrets.names.includes(name)),
    error: deploySecrets.error || "",
  };

  for (const [label, secrets] of [
    ["source-required-secrets", report.sourceSecrets],
    ["deploy-required-secrets", report.deploySecrets],
  ]) {
    const ok = secrets.readable && secrets.missing.length === 0;
    report.checks.push(buildCheck(label, ok, ok ? "齐全" : secrets.error || `缺少 ${secrets.missing.join(", ")}`));
    if (!ok) {
      report.blocking.push(label);
    }
  }

  const sourceVariables = listVariables(sourceRepository);
  report.sourceVariables = {
    readable: sourceVariables.ok,
    optional: ["CLIENT_RELEASE_SYNC_DEPLOY_FACTS"],
    present: sourceVariables.names.includes("CLIENT_RELEASE_SYNC_DEPLOY_FACTS"),
    error: sourceVariables.error || "",
  };
  report.checks.push(
    buildCheck(
      "source-optional-variable",
      true,
      report.sourceVariables.present
        ? "CLIENT_RELEASE_SYNC_DEPLOY_FACTS 已配置"
        : "未配置 CLIENT_RELEASE_SYNC_DEPLOY_FACTS；仍可通过 workflow input 手动开启",
    ),
  );

  finish(report, args);
}

function finish(report, args) {
  report.ok = report.blocking.length === 0;
  report.configuration = buildConfiguration(report);
  report.nextActions = buildNextActions(report);

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    console.log("Client release GitHub prereqs");
    console.log(`source: ${report.repositories.source || "-"}`);
    console.log(`deploy: ${report.repositories.deploy || "-"}`);
    console.log(`event: ${report.clientReleaseFactsEventType || "-"}`);
    for (const check of report.checks) {
      console.log(`${check.ok ? "OK" : "MISSING"} ${check.name}: ${check.detail}`);
    }
    if (report.nextActions.length > 0) {
      console.log("next actions:");
      for (const action of report.nextActions) {
        console.log(`- ${action}`);
      }
    }
    console.log(`result: ${report.ok ? "ok" : `blocked (${report.blocking.join(", ")})`}`);
  }

  if (args.strict && !report.ok) {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
