#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  readProjectMetadata,
  validateBusinessProjectMetadata,
  writeProjectMetadata,
} from "../lib/project-metadata.mjs";

function usage() {
  return `用法:
  node scripts/release/sync-live-state.mjs --facts-file <runtime-facts.json> [--check|--write]

选项:
  --facts-file <file>        rtnn-deploy 生成的 runtime facts JSON
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

function readRuntimeFacts(factsFile) {
  const report = JSON.parse(readFileSync(factsFile, "utf8"));

  if (report.schemaVersion !== "rtnn.deploy.runtime-facts.v1") {
    throw new Error("runtime facts schemaVersion 不匹配");
  }

  if (!Array.isArray(report.environments)) {
    throw new Error("runtime facts 缺少 environments 数组");
  }

  return report;
}

function assertBindingMatches(metadata, report) {
  const errors = [];
  const binding = report.binding ?? {};

  if (metadata.project.repo !== binding.sourceRepository) {
    errors.push(
      `project.repo 与 runtime facts sourceRepository 不一致: ${metadata.project.repo} != ${binding.sourceRepository}`,
    );
  }

  if (metadata.deployment.application !== binding.application) {
    errors.push(
      `deployment.application 与 runtime facts 不一致: ${metadata.deployment.application} != ${binding.application}`,
    );
  }

  if (metadata.deployment.imageNamePrefix !== binding.imageNamePrefix) {
    errors.push(
      `deployment.imageNamePrefix 与 runtime facts 不一致: ${metadata.deployment.imageNamePrefix} != ${binding.imageNamePrefix}`,
    );
  }

  if (metadata.deployment.dispatchEventType !== binding.dispatchEventType) {
    errors.push(
      `deployment.dispatchEventType 与 runtime facts 不一致: ${metadata.deployment.dispatchEventType} != ${binding.dispatchEventType}`,
    );
  }

  if (errors.length > 0) {
    throw new Error(errors.join("；"));
  }
}

function buildDesiredState(environmentFact) {
  const release = environmentFact.release ?? {};
  const deployVersion = String(release.deployVersion ?? "").trim();
  const sourceSha = String(release.sourceSha ?? "").trim();

  if (!environmentFact.source?.exists) {
    throw new Error(`${environmentFact.environment} 缺少可用 runtime source`);
  }

  if (!deployVersion) {
    throw new Error(`${environmentFact.environment} 缺少 DEPLOY_VERSION`);
  }

  return {
    activeRelease: deployVersion,
    ...(sourceSha ? { sourceSha } : {}),
  };
}

function diffLiveState(current, desired) {
  const changes = [];

  for (const [key, value] of Object.entries(desired)) {
    if (current?.[key] !== value) {
      changes.push({ key, before: current?.[key] ?? "", after: value });
    }
  }

  return changes;
}

function selectEnvironmentFacts(report, requestedEnvironments) {
  const factsByEnvironment = new Map(
    report.environments.map((environmentFact) => [
      environmentFact.environment,
      environmentFact,
    ]),
  );
  const environments =
    requestedEnvironments.length > 0
      ? requestedEnvironments
      : report.environments.map((environmentFact) => environmentFact.environment);

  return environments.map((environment) => {
    const environmentFact = factsByEnvironment.get(environment);
    if (!environmentFact) {
      throw new Error(`runtime facts 缺少环境: ${environment}`);
    }
    return environmentFact;
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const metadata = validateBusinessProjectMetadata(rootDir, {
    requireConcreteRepositories: true,
  });
  const report = readRuntimeFacts(path.resolve(rootDir, args.factsFile));

  assertBindingMatches(metadata, report);

  const nextMetadata = readProjectMetadata(rootDir);
  const selectedFacts = selectEnvironmentFacts(report, args.environments);
  const allChanges = [];

  for (const environmentFact of selectedFacts) {
    const desired = buildDesiredState(environmentFact);
    const current = nextMetadata.liveState?.[environmentFact.environment] ?? {};
    const changes = diffLiveState(current, desired);

    if (changes.length > 0) {
      allChanges.push({ environment: environmentFact.environment, changes });
    }

    if (args.mode === "write") {
      nextMetadata.liveState = nextMetadata.liveState ?? {};
      nextMetadata.liveState[environmentFact.environment] = {
        ...current,
        ...desired,
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
