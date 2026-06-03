#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  assertRuntimeBindingMatches,
  collectRuntimeLiveStateChanges,
  compareClientLiveState,
  readRuntimeFacts,
} from "../lib/release-facts.mjs";
import {
  PROJECT_METADATA_FILE,
  readProjectMetadata,
  validateBusinessProjectMetadata,
  writeProjectMetadata,
} from "../lib/project-metadata.mjs";

function usage() {
  return `用法:
  node scripts/release/prepare-live-state-pr.mjs --facts-file <runtime-facts.json> [options]

选项:
  --facts-file <file>            独立部署执行仓生成的 runtime facts JSON
  --environment <name>           只处理某个环境，可重复或用逗号分隔
  --client-artifacts-dir <dir>   release-clients workflow 产出的 artifacts/client-release 目录
  --summary-md <file>            写入 PR body Markdown，默认不写
  --allow-dirty-path <path>      允许 CI 前置步骤留下的未跟踪路径，可重复或逗号分隔
  --json                         输出机器可读 JSON

说明:
  本脚本用于 CI 准备 liveState-only PR。它只允许改写 .rtnn/project.json
  的 liveState 字段，不提交、不推送、不创建 PR。
`;
}

function parseArgs(argv) {
  const args = {
    factsFile: "",
    environments: [],
    clientArtifactsDir: "",
    summaryMdFile: "",
    allowedDirtyPaths: [],
    json: false,
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
      case "--summary-md":
        args.summaryMdFile = String(argv[++index] ?? "").trim();
        break;
      case "--allow-dirty-path":
        args.allowedDirtyPaths.push(...String(argv[++index] ?? "").split(","));
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

  args.environments = args.environments
    .map((environment) => environment.trim())
    .filter(Boolean);
  args.allowedDirtyPaths = args.allowedDirtyPaths
    .map((filePath) => filePath.trim())
    .filter(Boolean);

  if (!args.factsFile) {
    throw new Error("必须传入 --facts-file");
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

function gitQuiet(args) {
  const result = execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  return result;
}

function normalizeStatusPath(filePath) {
  if (filePath === "rtnn/project.json") {
    return PROJECT_METADATA_FILE;
  }
  return filePath;
}

function listChangedFiles() {
  return git(["status", "--porcelain", "--untracked-files=all"])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => normalizeStatusPath(line.slice(3).trim()))
    .filter(Boolean);
}

function normalizeRelativePath(rootDir, filePath) {
  if (!filePath) {
    return "";
  }

  return path.relative(rootDir, path.resolve(rootDir, filePath));
}

function pathIsUnder(value, dir) {
  return value === dir || value.startsWith(`${dir}/`);
}

function isInsideWorkspace(relativePath) {
  return relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

function isTrackedFile(filePath) {
  try {
    gitQuiet(["ls-files", "--error-unmatch", "--", filePath]);
    return true;
  } catch {
    return false;
  }
}

function assertSummaryPathAllowed(rootDir, filePath) {
  if (!filePath) {
    return;
  }

  const relativePath = normalizeRelativePath(rootDir, filePath);
  if (!isInsideWorkspace(relativePath)) {
    return;
  }

  const generatedDirs = ["tmp", ".tmp", "artifacts"];
  if (!generatedDirs.some((dir) => pathIsUnder(relativePath, dir))) {
    throw new Error(
      `--summary-md 写入仓库内部时只能使用临时/产物目录: ${generatedDirs.join(", ")}`,
    );
  }

  if (isTrackedFile(relativePath)) {
    throw new Error(`--summary-md 不能覆盖 git 已跟踪文件: ${relativePath}`);
  }
}

function assertOnlyProjectMetadataChanged(rootDir, allowedPaths = []) {
  const changedFiles = listChangedFiles();
  const allowed = new Set([PROJECT_METADATA_FILE, ...allowedPaths.filter(Boolean)]);
  const allowedDirs = allowedPaths
    .filter((item) => item && !path.extname(item))
    .map((item) => item.replace(/\/+$/, ""));
  const unexpected = changedFiles.filter(
    (filePath) =>
      !allowed.has(filePath) &&
      !allowedDirs.some((dir) => pathIsUnder(filePath, dir)),
  );

  if (unexpected.length > 0) {
    throw new Error(
      `liveState PR 准备只允许修改 ${PROJECT_METADATA_FILE}，当前工作区还有: ${unexpected.join(", ")}`,
    );
  }
}

function updateRuntimeLiveState(metadata, report, environments) {
  const environmentChanges = collectRuntimeLiveStateChanges(
    metadata,
    report,
    environments,
  );
  const changed = [];

  metadata.liveState = metadata.liveState ?? {};
  for (const item of environmentChanges) {
    if (item.changes.length > 0) {
      changed.push({ environment: item.environment, changes: item.changes });
    }
    metadata.liveState[item.environment] = {
      ...item.current,
      ...item.desired,
    };
  }

  return changed;
}

function updateClientLiveState(metadata, artifactsDir, environments) {
  if (!artifactsDir) {
    return [];
  }

  const changed = [];
  for (const environment of environments) {
    const comparison = compareClientLiveState(metadata, artifactsDir, environment);
    if (comparison.changes.length > 0) {
      changed.push({
        environment,
        changes: comparison.changes.map(({ client, target }) => ({
          client,
          target,
        })),
      });
    }

    metadata.liveState = metadata.liveState ?? {};
    metadata.liveState[environment] = {
      ...comparison.currentEnvironment,
      clients: {
        ...comparison.currentClients,
        ...Object.fromEntries(
          Object.entries(comparison.desiredClients).map(([client, targets]) => [
            client,
            {
              ...(comparison.currentClients[client] ?? {}),
              ...targets,
            },
          ]),
        ),
      },
    };
  }

  return changed;
}

function buildMarkdown(result) {
  const lines = [
    "# Sync RTNN liveState",
    "",
    "This PR refreshes the derived non-sensitive `.rtnn/project.json liveState` snapshot from deploy/runtime facts.",
    "",
    "## Runtime changes",
  ];

  if (result.runtimeChanges.length === 0) {
    lines.push("", "- No runtime liveState changes.");
  } else {
    lines.push("");
    for (const item of result.runtimeChanges) {
      for (const change of item.changes) {
        lines.push(
          `- ${item.environment}.${change.key}: ${change.before || "-"} -> ${change.after}`,
        );
      }
    }
  }

  lines.push("", "## Client changes");
  if (result.clientChanges.length === 0) {
    lines.push("", "- No client liveState changes.");
  } else {
    lines.push("");
    for (const item of result.clientChanges) {
      for (const change of item.changes) {
        lines.push(
          `- ${item.environment}.clients.${change.client}.${change.target}`,
        );
      }
    }
  }

  lines.push(
    "",
    "This update must remain liveState-only. Do not include source or contract changes in this PR.",
    "",
  );

  return lines.join("\n");
}

function writeOptionalFile(filePath, content) {
  if (!filePath) {
    return;
  }

  const resolved = path.resolve(process.cwd(), filePath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, content);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const allowedWorkspacePaths = [
    normalizeRelativePath(rootDir, args.factsFile),
    normalizeRelativePath(rootDir, args.clientArtifactsDir),
    normalizeRelativePath(rootDir, args.summaryMdFile),
    ...args.allowedDirtyPaths.map((filePath) => normalizeRelativePath(rootDir, filePath)),
  ];

  assertSummaryPathAllowed(rootDir, args.summaryMdFile);
  assertOnlyProjectMetadataChanged(rootDir, allowedWorkspacePaths);

  const metadata = validateBusinessProjectMetadata(rootDir, {
    requireConcreteRepositories: true,
  });
  const nextMetadata = readProjectMetadata(rootDir);
  const report = readRuntimeFacts(path.resolve(rootDir, args.factsFile));
  assertRuntimeBindingMatches(metadata, report);

  const environments =
    args.environments.length > 0
      ? args.environments
      : report.environments.map((environmentFact) => environmentFact.environment);
  const runtimeChanges = updateRuntimeLiveState(
    nextMetadata,
    report,
    environments,
  );
  const clientChanges = updateClientLiveState(
    nextMetadata,
    args.clientArtifactsDir
      ? path.resolve(rootDir, args.clientArtifactsDir)
      : "",
    environments,
  );

  const metadataPath = writeProjectMetadata(rootDir, nextMetadata);
  assertOnlyProjectMetadataChanged(rootDir, allowedWorkspacePaths);

  const result = {
    ok: true,
    changed: runtimeChanges.length > 0 || clientChanges.length > 0,
    metadataPath,
    pr: {
      title: "chore: sync RTNN liveState",
      body: buildMarkdown({ runtimeChanges, clientChanges }),
    },
    runtimeChanges,
    clientChanges,
  };

  writeOptionalFile(args.summaryMdFile, result.pr.body);
  assertOnlyProjectMetadataChanged(rootDir, allowedWorkspacePaths);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`[live-state-pr] changed=${result.changed ? "true" : "false"}`);
  console.log(`[live-state-pr] metadata=${metadataPath}`);
  console.log(`[live-state-pr] title=${result.pr.title}`);
  if (args.summaryMdFile) {
    console.log(`[live-state-pr] summary=${args.summaryMdFile}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
