#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function usage() {
  return `用法:
  node scripts/release/run-client-release-github-dry-run.mjs [options]

选项:
  --repo <repo>              业务仓，默认读取 .rtnn/project.json project.repo
  --ref <ref>                触发 ref，默认当前 git branch，否则 main
  --version <version>        可选客户端 release version
  --channel <name>           testing 或 production，默认 testing
  --sync-deploy-facts        触发 deploy 仓同步客户端 facts
  --no-sync-deploy-facts     不触发 deploy facts 同步
  --watch                    触发后等待 workflow 完成
  --skip-prereqs             跳过 GitHub 前置条件 strict 检查

说明:
  该脚本只触发 release-clients dry-run；默认不触发 deploy facts 同步。
`;
}

function parseArgs(argv) {
  const args = {
    repo: "",
    ref: "",
    version: "",
    channel: "testing",
    syncDeployFacts: false,
    watch: false,
    skipPrereqs: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];

    switch (item) {
      case "--repo":
        args.repo = argv[++index] ?? "";
        break;
      case "--ref":
        args.ref = argv[++index] ?? "";
        break;
      case "--version":
        args.version = argv[++index] ?? "";
        break;
      case "--channel":
        args.channel = argv[++index] ?? "";
        break;
      case "--sync-deploy-facts":
        args.syncDeployFacts = true;
        break;
      case "--no-sync-deploy-facts":
        args.syncDeployFacts = false;
        break;
      case "--watch":
        args.watch = true;
        break;
      case "--skip-prereqs":
        args.skipPrereqs = true;
        break;
      case "--help":
      case "-h":
        console.log(usage());
        process.exit(0);
      default:
        throw new Error(`未知参数: ${item}`);
    }
  }

  if (!["testing", "production"].includes(args.channel)) {
    throw new Error("--channel 只支持 testing 或 production");
  }

  return args;
}

function normalizeString(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: false,
    stdio: options.stdio ?? "pipe",
  });

  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? "",
  };
}

function runRequired(command, args, label) {
  const result = run(command, args, { stdio: "inherit" });
  if (!result.ok) {
    throw new Error(`${label} 失败`);
  }
}

function resolveCurrentBranch() {
  const result = run("git", ["branch", "--show-current"]);
  return result.ok ? result.stdout : "";
}

function resolveDefaults(rootDir, args) {
  const metadataPath = path.join(rootDir, ".rtnn/project.json");
  const metadata = existsSync(metadataPath) ? readJson(metadataPath) : {};

  return {
    repo: normalizeString(args.repo, metadata.project?.repo),
    ref: normalizeString(args.ref, resolveCurrentBranch() || "main"),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function latestRun(repo, workflowFile) {
  const result = run("gh", [
    "run",
    "list",
    "--repo",
    repo,
    "--workflow",
    workflowFile,
    "--limit",
    "1",
    "--json",
    "databaseId,status,conclusion,displayTitle,createdAt,url",
  ]);

  if (!result.ok || !result.stdout) {
    return null;
  }

  return JSON.parse(result.stdout)[0] ?? null;
}

async function waitForLatestRun(repo, workflowFile) {
  let runInfo = null;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    runInfo = latestRun(repo, workflowFile);
    if (runInfo) {
      break;
    }
    await sleep(3000);
  }

  if (!runInfo) {
    throw new Error("未找到刚触发的 release-clients workflow run");
  }

  console.log(`[client-release-dry-run] run=${runInfo.databaseId} ${runInfo.url}`);
  runRequired(
    "gh",
    ["run", "watch", String(runInfo.databaseId), "--repo", repo, "--exit-status"],
    "等待 release-clients dry-run",
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const defaults = resolveDefaults(rootDir, args);
  const workflowFile = "release-clients.yml";

  if (!defaults.repo) {
    throw new Error("无法确定业务仓 repo，请传入 --repo 或补齐 .rtnn/project.json project.repo");
  }

  if (!args.skipPrereqs) {
    const prereqArgs = [
      "scripts/release/check-client-release-github-prereqs.mjs",
      "--strict",
    ];
    runRequired(process.execPath, prereqArgs, "GitHub 前置条件检查");
  }

  const workflowArgs = [
    "workflow",
    "run",
    workflowFile,
    "--repo",
    defaults.repo,
    "--ref",
    defaults.ref,
    "-f",
    `channel=${args.channel}`,
    "-f",
    "execution_mode=github-hosted",
    "-f",
    "dry_run=true",
    "-f",
    "publish_github_release=false",
    "-f",
    `sync_deploy_facts=${args.syncDeployFacts ? "true" : "false"}`,
  ];

  if (args.version) {
    workflowArgs.push("-f", `version=${args.version}`);
  }

  console.log(
    `[client-release-dry-run] trigger ${defaults.repo}/${workflowFile} ref=${defaults.ref} channel=${args.channel} sync_deploy_facts=${args.syncDeployFacts}`,
  );
  runRequired("gh", workflowArgs, "触发 release-clients dry-run");

  if (args.watch) {
    await waitForLatestRun(defaults.repo, workflowFile);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
