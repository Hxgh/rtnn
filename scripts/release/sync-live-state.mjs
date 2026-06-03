#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import {
  assertRuntimeBindingMatches,
  collectRuntimeLiveStateChanges,
  readRuntimeFacts,
} from "../lib/release-facts.mjs";
import {
  readProjectMetadata,
  validateBusinessProjectMetadata,
  writeProjectMetadata,
} from "../lib/project-metadata.mjs";

function usage() {
  return `用法:
  node scripts/release/sync-live-state.mjs --facts-file <runtime-facts.json> [--check|--write]

选项:
  --facts-file <file>        独立部署执行仓生成的 runtime facts JSON
  --environment <name>       只处理某个环境，可重复或用逗号分隔
  --check                    只校验 liveState 是否与 runtime facts 一致，默认行为
  --write                    写回 .rtnn/project.json 的 liveState
`;
}

function parseArgs(argv) {
  const args = {
    factsFile: "",
    environments: [],
    mode: "check",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];

    switch (item) {
      case "--":
        break;
      case "--facts-file":
        args.factsFile = argv[++index] ?? "";
        break;
      case "--environment":
        args.environments.push(...String(argv[++index] ?? "").split(","));
        break;
      case "--check":
        args.mode = "check";
        break;
      case "--write":
        args.mode = "write";
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

  if (!args.factsFile) {
    throw new Error("必须传入 --facts-file");
  }

  if (!existsSync(args.factsFile)) {
    throw new Error(`runtime facts 文件不存在: ${args.factsFile}`);
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const metadata = validateBusinessProjectMetadata(rootDir, {
    requireConcreteRepositories: true,
  });
  const report = readRuntimeFacts(path.resolve(rootDir, args.factsFile));

  assertRuntimeBindingMatches(metadata, report);

  const nextMetadata = readProjectMetadata(rootDir);
  const environmentChanges = collectRuntimeLiveStateChanges(
    nextMetadata,
    report,
    args.environments,
  );
  const allChanges = environmentChanges
    .filter((item) => item.changes.length > 0)
    .map(({ environment, changes }) => ({ environment, changes }));

  for (const item of environmentChanges) {
    if (args.mode === "write") {
      nextMetadata.liveState = nextMetadata.liveState ?? {};
      nextMetadata.liveState[item.environment] = {
        ...item.current,
        ...item.desired,
      };
    }
  }

  if (allChanges.length === 0) {
    console.log("[live-state] .rtnn/project.json 已与 runtime facts 一致");
    return;
  }

  for (const item of allChanges) {
    for (const change of item.changes) {
      console.log(
        `[live-state] ${item.environment}.${change.key}: ${change.before || "-"} -> ${change.after}`,
      );
    }
  }

  if (args.mode === "check") {
    throw new Error("liveState 与 runtime facts 不一致；确认后使用 --write 写回");
  }

  const metadataPath = writeProjectMetadata(rootDir, nextMetadata);
  console.log(`[live-state] 已更新 ${metadataPath}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
