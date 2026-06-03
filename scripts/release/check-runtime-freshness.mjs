#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import {
  assertRuntimeBindingMatches,
  assertRuntimeFactsSafe,
  compareRuntimeLiveState,
  readRuntimeFacts,
} from "../lib/release-facts.mjs";
import {
  PROJECT_METADATA_FILE,
  readProjectMetadata,
  validateBusinessProjectMetadata,
} from "../lib/project-metadata.mjs";

function usage() {
  return `用法:
  node scripts/release/check-runtime-freshness.mjs --facts-file <runtime-facts.json> [--environment <name>] [--json]

选项:
  --facts-file <file>        独立部署执行仓生成的 runtime facts JSON
  --environment <name>       只检查某个环境，可重复或用逗号分隔
  --json                     输出机器可读 JSON

说明:
  本脚本只读取非敏感运行事实，不写回 .rtnn/project.json。
  如需写回 liveState，使用 pnpm run release:sync-live-state -- --facts-file <file> --write。
`;
}

function parseArgs(argv) {
  const args = {
    factsFile: "",
    environments: [],
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];

    switch (item) {
      case "--":
        break;
      case "--facts-file":
        args.factsFile = String(argv[++index] ?? "").trim();
        break;
      case "--environment":
        args.environments.push(...String(argv[++index] ?? "").split(","));
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

  if (!args.factsFile) {
    throw new Error("必须传入 --facts-file");
  }

  if (!existsSync(args.factsFile)) {
    throw new Error(`runtime facts 文件不存在: ${args.factsFile}`);
  }

  return args;
}

function printHumanResult(result) {
  console.log(`[runtime-freshness] project=${result.project.repo}`);

  for (const environment of result.environments) {
    const status = environment.fresh ? "fresh" : "stale";
    const health = Object.entries(environment.observed.health)
      .filter(([, value]) => value)
      .map(([key]) => key)
      .join(", ");

    console.log(
      `[runtime-freshness] ${environment.environment}: ${status} live=${environment.current.activeRelease || "-"} runtime=${environment.observed.activeRelease || "-"} sha=${environment.observed.sourceSha || "-"} health=${health || "-"}`,
    );

    for (const mismatch of environment.mismatches) {
      console.log(
        `[runtime-freshness] ${environment.environment}.${mismatch.field}: live=${mismatch.expected || "-"} runtime=${mismatch.actual || "-"}${mismatch.reason ? ` (${mismatch.reason})` : ""}`,
      );
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const metadataPath = path.join(rootDir, PROJECT_METADATA_FILE);

  if (!readProjectMetadata(rootDir)) {
    throw new Error(`缺少项目事实文件: ${metadataPath}`);
  }

  const metadata = validateBusinessProjectMetadata(rootDir, {
    requireConcreteRepositories: true,
  });
  const report = readRuntimeFacts(path.resolve(rootDir, args.factsFile));

  assertRuntimeFactsSafe(report);
  assertRuntimeBindingMatches(metadata, report);

  const environments = compareRuntimeLiveState(metadata, report, args.environments);
  const result = {
    ok: environments.every((environment) => environment.fresh),
    project: {
      repo: metadata.project.repo,
      deploymentRepo: metadata.deployment.repo,
      application: metadata.deployment.application,
    },
    environments,
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHumanResult(result);
  }

  if (!result.ok) {
    throw new Error("线上运行事实与 liveState 不一致");
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
