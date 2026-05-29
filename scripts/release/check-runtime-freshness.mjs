#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  PROJECT_METADATA_FILE,
  readProjectMetadata,
  validateBusinessProjectMetadata,
} from "../lib/project-metadata.mjs";

const RUNTIME_FACTS_SCHEMA_VERSION = "rtnn.deploy.runtime-facts.v1";
const SENSITIVE_KEY_PATTERN =
  /token|secret|password|authorization|cookie|database_?url|connection_?string|ssh/i;

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

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function readRuntimeFacts(factsFile) {
  const report = readJson(factsFile);

  if (report.schemaVersion !== RUNTIME_FACTS_SCHEMA_VERSION) {
    throw new Error("runtime facts schemaVersion 不匹配");
  }

  if (!Array.isArray(report.environments)) {
    throw new Error("runtime facts 缺少 environments 数组");
  }

  return report;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function collectSensitiveKeyPaths(value, prefix = "") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectSensitiveKeyPaths(item, `${prefix}[${index}]`),
    );
  }

  if (!isPlainObject(value)) {
    return [];
  }

  const paths = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = prefix ? `${prefix}.${key}` : key;
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      paths.push(nextPath);
      continue;
    }
    paths.push(...collectSensitiveKeyPaths(child, nextPath));
  }
  return paths;
}

function assertRuntimeFactsSafe(report) {
  const sensitivePaths = collectSensitiveKeyPaths(report);
  if (sensitivePaths.length > 0) {
    throw new Error(
      `runtime facts 包含疑似敏感字段: ${sensitivePaths.join(", ")}`,
    );
  }
}

function assertBindingMatches(metadata, report) {
  const errors = [];
  const binding = isPlainObject(report.binding) ? report.binding : {};

  const expected = {
    sourceRepository: metadata.project.repo,
    application: metadata.deployment.application,
    imageNamePrefix: metadata.deployment.imageNamePrefix,
    dispatchEventType: metadata.deployment.dispatchEventType,
  };

  for (const [key, value] of Object.entries(expected)) {
    if (binding[key] !== value) {
      errors.push(`${key}: ${value} != ${binding[key] ?? "(missing)"}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`runtime facts 绑定关系不匹配: ${errors.join("；")}`);
  }
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

function readObservedVersion(environmentFact) {
  const versionResult = environmentFact.health?.results?.version;
  const body = versionResult?.body;

  if (!versionResult?.ok || !isPlainObject(body)) {
    return {
      deployVersion: "",
      sourceSha: "",
    };
  }

  return {
    deployVersion: String(body.version ?? "").trim(),
    sourceSha: String(body.sourceSha ?? "").trim(),
  };
}

function buildObservedState(environmentFact) {
  const release = isPlainObject(environmentFact.release)
    ? environmentFact.release
    : {};
  const observedVersion = readObservedVersion(environmentFact);
  const activeRelease =
    observedVersion.deployVersion || String(release.deployVersion ?? "").trim();
  const sourceSha =
    observedVersion.sourceSha || String(release.sourceSha ?? "").trim();

  return {
    activeRelease,
    sourceSha,
    health: {
      version: Boolean(environmentFact.health?.results?.version?.ok),
      readyz: Boolean(environmentFact.health?.results?.readyz?.ok),
      healthz: Boolean(environmentFact.health?.results?.healthz?.ok),
    },
  };
}

function compareEnvironment(metadata, environmentFact) {
  const environment = environmentFact.environment;
  const current = metadata.liveState?.[environment] ?? {};
  const observed = buildObservedState(environmentFact);
  const mismatches = [];

  if (!observed.activeRelease) {
    mismatches.push({
      field: "activeRelease",
      expected: current.activeRelease ?? "",
      actual: "",
      reason: "runtime facts 缺少可识别 DEPLOY_VERSION 或 /version.version",
    });
  } else if (current.activeRelease !== observed.activeRelease) {
    mismatches.push({
      field: "activeRelease",
      expected: current.activeRelease ?? "",
      actual: observed.activeRelease,
    });
  }

  if (observed.sourceSha && current.sourceSha !== observed.sourceSha) {
    mismatches.push({
      field: "sourceSha",
      expected: current.sourceSha ?? "",
      actual: observed.sourceSha,
    });
  }

  return {
    environment,
    fresh: mismatches.length === 0,
    current: {
      activeRelease: current.activeRelease ?? "",
      sourceSha: current.sourceSha ?? "",
    },
    observed,
    mismatches,
  };
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
  assertBindingMatches(metadata, report);

  const environments = selectEnvironmentFacts(
    report,
    args.environments,
  ).map((environmentFact) => compareEnvironment(metadata, environmentFact));
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
