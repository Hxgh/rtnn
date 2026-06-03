#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_OUTPUT_DIR = "artifacts/live-state-pr";
const DEFAULT_BRANCH_PREFIX = "automation/rtnn-live-state";
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function usage() {
  return `用法:
  node scripts/release/run-live-state-pr-ci.mjs --facts-file <runtime-facts.json> [options]

选项:
  --facts-file <file>            deploy 仓生成的 runtime facts JSON
  --environment <name>           只处理某个环境，可重复或用逗号分隔
  --client-artifacts-dir <dir>   可选 client release artifacts 目录
  --output-dir <dir>             输出目录，默认 artifacts/live-state-pr
  --branch <name>                liveState-only 分支名，默认自动生成
  --base-branch <name>           PR base，默认 main
  --allow-dirty-path <path>      允许 CI 前置步骤留下的未跟踪路径，可重复或逗号分隔
  --create-pr                    使用 gh 创建 PR
  --no-push                      不 push 分支

说明:
  本脚本用于 GitHub Actions 编排 liveState-only PR。核心写回仍由
  prepare-live-state-pr 完成；本脚本只负责 branch、commit、push 和可选 PR。
`;
}

function parseArgs(argv) {
  const args = {
    factsFile: "",
    environments: [],
    clientArtifactsDir: "",
    outputDir: DEFAULT_OUTPUT_DIR,
    branch: "",
    baseBranch: "main",
    allowedDirtyPaths: [],
    createPr: false,
    push: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];

    switch (item) {
      case "--facts-file":
        args.factsFile = String(argv[++index] ?? "").trim();
        break;
      case "--environment":
        args.environments.push(...String(argv[++index] ?? "").split(","));
        break;
      case "--client-artifacts-dir":
        args.clientArtifactsDir = String(argv[++index] ?? "").trim();
        break;
      case "--output-dir":
        args.outputDir = String(argv[++index] ?? "").trim();
        break;
      case "--branch":
        args.branch = String(argv[++index] ?? "").trim();
        break;
      case "--base-branch":
        args.baseBranch = String(argv[++index] ?? "").trim();
        break;
      case "--allow-dirty-path":
        args.allowedDirtyPaths.push(...String(argv[++index] ?? "").split(","));
        break;
      case "--create-pr":
        args.createPr = true;
        break;
      case "--no-push":
        args.push = false;
        break;
      case "--help":
      case "-h":
        console.log(usage());
        process.exit(0);
      default:
        throw new Error(`未知参数: ${item}`);
    }
  }

  args.environments = args.environments
    .map((environment) => environment.trim())
    .filter(Boolean);
  args.allowedDirtyPaths = args.allowedDirtyPaths
    .map((filePath) => filePath.trim())
    .filter(Boolean);

  if (!args.factsFile) {
    throw new Error("必须传入 --facts-file");
  }

  if (args.createPr && !args.push) {
    throw new Error("--create-pr 不能与 --no-push 同时使用");
  }

  if (!existsSync(args.factsFile)) {
    throw new Error(`runtime facts 文件不存在: ${args.factsFile}`);
  }

  if (args.clientArtifactsDir && !existsSync(args.clientArtifactsDir)) {
    throw new Error(`客户端 release artifacts 目录不存在: ${args.clientArtifactsDir}`);
  }

  return args;
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `${command} ${args.join(" ")} failed`);
  }

  return result.stdout.trim();
}

function normalizeRelativePath(filePath) {
  if (!filePath) {
    return "";
  }

  return path.relative(process.cwd(), path.resolve(process.cwd(), filePath));
}

function pathIsUnder(value, dir) {
  return value === dir || value.startsWith(`${dir}/`);
}

function changedFiles() {
  return git(["status", "--porcelain", "--untracked-files=all"])
    .split(/\r?\n/)
    .filter(Boolean);
}

function assertCleanWorkspace(allowedPaths = []) {
  const allowed = allowedPaths.filter(Boolean);
  const allowedDirs = allowed
    .filter((item) => !path.extname(item))
    .map((item) => item.replace(/\/+$/, ""));
  const files = changedFiles().filter((line) => {
    const filePath = line.slice(3).trim();
    return (
      !allowed.includes(filePath) &&
      !allowedDirs.some((dir) => pathIsUnder(filePath, dir))
    );
  });

  if (files.length > 0) {
    throw new Error(
      `liveState PR CI 需要干净工作区，当前还有: ${files.join(", ")}`,
    );
  }
}

function currentShortSha() {
  try {
    return git(["rev-parse", "--short=12", "HEAD"]);
  } catch {
    return "local";
  }
}

function defaultBranchName(args) {
  const envSuffix =
    args.environments.length > 0 ? args.environments.join("-") : "all";
  return `${DEFAULT_BRANCH_PREFIX}/${envSuffix}-${currentShortSha()}`;
}

function checkoutBranch(branch) {
  run("git", ["checkout", "-B", branch]);
}

function runPrepare(args, summaryPath) {
  const commandArgs = [
    path.join(ROOT_DIR, "scripts/release/prepare-live-state-pr.mjs"),
    "--facts-file",
    args.factsFile,
    "--summary-md",
    summaryPath,
    "--json",
  ];

  for (const environment of args.environments) {
    commandArgs.push("--environment", environment);
  }

  if (args.clientArtifactsDir) {
    commandArgs.push("--client-artifacts-dir", args.clientArtifactsDir);
  }

  for (const allowedPath of args.allowedDirtyPaths) {
    commandArgs.push("--allow-dirty-path", allowedPath);
  }

  const stdout = run(process.execPath, commandArgs);
  return JSON.parse(stdout);
}

function ensureGitIdentity() {
  const existingName = spawnSync("git", ["config", "user.name"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const existingEmail = spawnSync("git", ["config", "user.email"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  if (!existingName.stdout.trim()) {
    run("git", ["config", "user.name", "github-actions[bot]"]);
  }

  if (!existingEmail.stdout.trim()) {
    run(
      "git",
      [
        "config",
        "user.email",
        "41898282+github-actions[bot]@users.noreply.github.com",
      ],
    );
  }
}

function commitLiveState() {
  run("git", ["add", ".rtnn/project.json"]);
  run("git", ["commit", "-m", "chore: sync RTNN liveState"]);
}

function pushBranch(branch) {
  run("git", ["push", "--force-with-lease", "origin", `HEAD:${branch}`]);
}

async function githubRequest(apiPath, options = {}) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    throw new Error("--create-pr 需要 GITHUB_TOKEN 或 GH_TOKEN");
  }

  const response = await fetch(`https://api.github.com${apiPath}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

async function createPullRequest(args, branch, bodyPath) {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) {
    throw new Error("--create-pr 需要 GITHUB_REPOSITORY");
  }

  const body = readFileSync(path.resolve(process.cwd(), bodyPath), "utf8");
  const create = await githubRequest(`/repos/${repository}/pulls`, {
    method: "POST",
    body: JSON.stringify({
      title: "chore: sync RTNN liveState",
      head: branch,
      base: args.baseBranch,
      body,
    }),
  });

  if (create.ok) {
    return create.body.html_url;
  }

  const [owner] = repository.split("/");
  const existing = await githubRequest(
    `/repos/${repository}/pulls?state=open&head=${encodeURIComponent(`${owner}:${branch}`)}`,
  );
  if (existing.ok && Array.isArray(existing.body) && existing.body.length > 0) {
    return existing.body[0].html_url;
  }

  throw new Error(
    `GitHub PR 创建失败: ${create.status} ${JSON.stringify(create.body)}`,
  );
}

async function tryCreatePullRequest(args, branch, bodyPath) {
  try {
    return { prUrl: await createPullRequest(args, branch, bodyPath) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("GitHub Actions is not permitted to create or approve pull requests")) {
      return {
        prBlocked: true,
        prBlockedReason:
          "github-actions-pull-request-creation-disabled",
        prBlockedMessage: message,
      };
    }

    throw error;
  }
}

function writeGithubOutput(result) {
  if (!process.env.GITHUB_OUTPUT) {
    return;
  }

  appendFileSync(
    process.env.GITHUB_OUTPUT,
    [
      `changed=${result.changed ? "true" : "false"}`,
      `branch=${result.branch}`,
      `commit=${result.commit ?? ""}`,
      `pr_url=${result.prUrl ?? ""}`,
      `pr_blocked=${result.prBlocked ? "true" : "false"}`,
      `pr_blocked_reason=${result.prBlockedReason ?? ""}`,
      `output_dir=${result.outputDir}`,
      "",
    ].join("\n"),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = path.resolve(process.cwd(), args.outputDir);
  const summaryPath = path.join(args.outputDir, "live-state-pr.md");
  const resultPath = path.join(outputDir, "live-state-pr.json");
  const branch = args.branch || defaultBranchName(args);
  mkdirSync(outputDir, { recursive: true });
  const allowedWorkspacePaths = [
    normalizeRelativePath(args.factsFile),
    normalizeRelativePath(args.clientArtifactsDir),
    normalizeRelativePath(args.outputDir),
    ...args.allowedDirtyPaths.map((filePath) => normalizeRelativePath(filePath)),
  ];

  assertCleanWorkspace(allowedWorkspacePaths);
  checkoutBranch(branch);

  const prepared = runPrepare(args, summaryPath);
  const result = {
    ok: true,
    changed: prepared.changed,
    branch,
    outputDir: args.outputDir,
    prTitle: prepared.pr?.title ?? "chore: sync RTNN liveState",
    runtimeChanges: prepared.runtimeChanges,
    clientChanges: prepared.clientChanges,
  };

  if (prepared.changed) {
    ensureGitIdentity();
    commitLiveState();
    result.commit = git(["rev-parse", "HEAD"]);

    if (args.push) {
      pushBranch(branch);
      result.pushed = true;
    } else {
      result.pushed = false;
    }

    if (args.createPr) {
      Object.assign(result, await tryCreatePullRequest(args, branch, summaryPath));
    }
  }

  writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  writeGithubOutput(result);
  console.log(JSON.stringify(result, null, 2));
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
