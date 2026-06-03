#!/usr/bin/env node

import {
  existsSync,
} from "node:fs";
import path from "node:path";
import { compareClientLiveState } from "../lib/release-facts.mjs";
import {
  PROJECT_METADATA_FILE,
  readProjectMetadata,
  writeProjectMetadata,
} from "../lib/project-metadata.mjs";

function usage() {
  return `用法:
  node scripts/release/sync-client-release-state.mjs --artifacts-dir <client-release-dir> --environment <name> [--check|--write]

选项:
  --artifacts-dir <dir>      release-clients workflow 产出的 artifacts/client-release 目录
  --environment <name>       写入 liveState 的环境，例如 testing 或 production
  --check                    只校验 liveState 是否与客户端 release facts 一致，默认行为
  --write                    写回 .rtnn/project.json 的 liveState
  --json                     输出机器可读 JSON
`;
}

function parseArgs(argv) {
  const args = {
    artifactsDir: "",
    environment: "",
    mode: "check",
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];

    switch (item) {
      case "--artifacts-dir":
        args.artifactsDir = argv[++index] ?? "";
        break;
      case "--environment":
        args.environment = argv[++index] ?? "";
        break;
      case "--check":
        args.mode = "check";
        break;
      case "--write":
        args.mode = "write";
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

  args.artifactsDir = String(args.artifactsDir).trim();
  args.environment = String(args.environment).trim();

  if (!args.artifactsDir) {
    throw new Error("必须传入 --artifacts-dir");
  }

  if (!args.environment) {
    throw new Error("必须传入 --environment");
  }

  if (!existsSync(args.artifactsDir)) {
    throw new Error(`客户端 release artifacts 目录不存在: ${args.artifactsDir}`);
  }

  return args;
}

function buildResult(args, changes, extra = {}) {
  return {
    ok: args.mode === "write" || changes.length === 0,
    mode: args.mode,
    environment: args.environment,
    artifactsDir: args.artifactsDir,
    changeCount: changes.length,
    changes,
    ...extra,
  };
}

function printJsonResult(result) {
  console.log(JSON.stringify(result, null, 2));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const metadata = readProjectMetadata(rootDir);

  if (!metadata) {
    throw new Error(`缺少项目事实文件: ${path.join(rootDir, PROJECT_METADATA_FILE)}`);
  }

  if (metadata.project?.role !== "business-source") {
    throw new Error("project.role 必须是 business-source");
  }

  const nextMetadata = readProjectMetadata(rootDir);
  const artifactsDir = path.resolve(rootDir, args.artifactsDir);
  const comparison = compareClientLiveState(
    nextMetadata,
    artifactsDir,
    args.environment,
  );
  const changes = comparison.changes;

  if (changes.length === 0) {
    if (args.json) {
      printJsonResult(buildResult(args, changes, { written: false }));
    } else {
      console.log("[client-live-state] .rtnn/project.json 已与客户端 release facts 一致");
    }
    return;
  }

  if (args.mode === "check") {
    if (args.json) {
      printJsonResult(buildResult(args, changes));
    }
    if (!args.json) {
      for (const change of changes) {
        console.log(
          `[client-live-state] ${args.environment}.clients.${change.client}.${change.target} 需要更新`,
        );
      }
    }
    throw new Error("客户端 liveState 与 release facts 不一致；确认后使用 --write 写回");
  }

  if (!args.json) {
    for (const change of changes) {
      console.log(
        `[client-live-state] ${args.environment}.clients.${change.client}.${change.target} 需要更新`,
      );
    }
  }

  nextMetadata.liveState = nextMetadata.liveState ?? {};
  nextMetadata.liveState[args.environment] = {
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

  const metadataPath = writeProjectMetadata(rootDir, nextMetadata);
  if (args.json) {
    printJsonResult(buildResult(args, changes, { written: true, metadataPath }));
  } else {
    console.log(`[client-live-state] 已更新 ${metadataPath}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
