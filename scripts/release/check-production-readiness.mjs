#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
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
import { resolveProjectProfile } from "../lib/project-profile.mjs";
import {
  RELEASE_STATUS_CODES as CODES,
  RELEASE_STATUS_VALUES as STATUS,
} from "../lib/release-status-contract.mjs";

function usage() {
  return `用法:
  node scripts/release/check-production-readiness.mjs --deploy-version <v*> [options]

选项:
  --deploy-version <tag>      即将发布到 production 的 v* tag
  --source-sha <sha>          可选，期望 tag 对应的源提交
  --facts-file <file>         可选，testing runtime facts；传入后要求 testing 为 fresh
  --json                      输出机器可读 JSON
  --summary-md                输出 Markdown 摘要
  --output <file>             将 JSON 结果写入文件

说明:
  本脚本只做 production promote 前只读门禁，不写 project metadata，不触发部署。
`;
}

function parseArgs(argv) {
  const args = {
    deployVersion: "",
    sourceSha: "",
    factsFile: "",
    json: false,
    summaryMd: false,
    outputFile: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];

    switch (item) {
      case "--":
        break;
      case "--deploy-version":
        args.deployVersion = String(argv[++index] ?? "").trim();
        break;
      case "--source-sha":
        args.sourceSha = String(argv[++index] ?? "").trim();
        break;
      case "--facts-file":
        args.factsFile = String(argv[++index] ?? "").trim();
        break;
      case "--json":
        args.json = true;
        break;
      case "--summary-md":
        args.summaryMd = true;
        break;
      case "--output":
        args.outputFile = String(argv[++index] ?? "").trim();
        break;
      case "--help":
      case "-h":
        console.log(usage());
        process.exit(0);
      default:
        throw new Error(`未知参数: ${item}`);
    }
  }

  if (!args.deployVersion) {
    throw new Error("必须传入 --deploy-version");
  }

  if (args.factsFile && !existsSync(args.factsFile)) {
    throw new Error(`runtime facts 文件不存在: ${args.factsFile}`);
  }

  return args;
}

function finding(level, code, message, details = {}) {
  return {
    level,
    code,
    message,
    ...(Object.keys(details).length > 0 ? { details } : {}),
  };
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function runGit(rootDir, args) {
  const result = spawnSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
    shell: false,
  });

  if (result.status !== 0) {
    return "";
  }

  return result.stdout.trim();
}

function shortSha(value) {
  return String(value ?? "").slice(0, 12);
}

function readMetadataCheck(rootDir) {
  try {
    const metadata = validateBusinessProjectMetadata(rootDir, {
      requireConcreteRepositories: true,
    });
    return {
      ok: true,
      status: STATUS.FRESH,
      code: CODES.OK,
      metadata,
      project: {
        repo: metadata.project.repo,
        deploymentRepo: metadata.deployment.repo,
        application: metadata.deployment.application,
        environments: metadata.deployment.environments,
        productionTrigger: metadata.deployment.productionTrigger ?? "",
      },
      findings: [],
    };
  } catch (error) {
    return {
      ok: false,
      status: STATUS.BLOCKED,
      code: CODES.INVALID_PROJECT_METADATA,
      error: errorMessage(error),
      metadata: null,
      findings: [
        finding(
          "error",
          CODES.INVALID_PROJECT_METADATA,
          "无法读取或验证业务仓项目事实",
          { error: errorMessage(error), file: PROJECT_METADATA_FILE },
        ),
      ],
    };
  }
}

function runProfileCheck(rootDir) {
  try {
    const profile = resolveProjectProfile(rootDir);
    const findings = [];

    for (const warning of profile.warnings ?? []) {
      findings.push(finding("warn", CODES.PROFILE_WARNING, warning));
    }

    return {
      ok: true,
      status: STATUS.FRESH,
      code: CODES.OK,
      profile: {
        source: profile.source,
        projectRole: profile.projectRole,
        deliveryConfigured: profile.deliveryConfigured,
        enabledServices: profile.enabledServices,
        enabledClients: profile.enabledClients,
      },
      findings,
    };
  } catch (error) {
    return {
      ok: false,
      status: STATUS.BLOCKED,
      code: CODES.PROFILE_ERROR,
      error: errorMessage(error),
      findings: [
        finding(
          "error",
          CODES.PROFILE_ERROR,
          "project profile 无法解析",
          { error: errorMessage(error) },
        ),
      ],
    };
  }
}

function runVersionCheck(rootDir, args) {
  const findings = [];

  if (!/^v[0-9].*/.test(args.deployVersion)) {
    findings.push(
      finding(
        "error",
        CODES.PRODUCTION_READINESS_INVALID,
        "production deploy_version 必须是 v* tag",
        { deployVersion: args.deployVersion },
      ),
    );
  }

  const tagSha = runGit(rootDir, ["rev-list", "-n", "1", args.deployVersion]);
  if (!tagSha) {
    findings.push(
      finding(
        "error",
        CODES.PRODUCTION_READINESS_INVALID,
        "找不到 production deploy_version 对应的 git tag",
        { deployVersion: args.deployVersion },
      ),
    );
  }

  if (args.sourceSha && tagSha && args.sourceSha !== tagSha) {
    findings.push(
      finding(
        "error",
        CODES.PRODUCTION_READINESS_INVALID,
        "source_sha 与 deploy_version tag 指向提交不一致",
        {
          deployVersion: args.deployVersion,
          sourceSha: args.sourceSha,
          tagSha,
        },
      ),
    );
  }

  return {
    ok: findings.filter((item) => item.level === "error").length === 0,
    status:
      findings.filter((item) => item.level === "error").length === 0
        ? STATUS.FRESH
        : STATUS.BLOCKED,
    code:
      findings.filter((item) => item.level === "error").length === 0
        ? CODES.OK
        : CODES.PRODUCTION_READINESS_INVALID,
    deployVersion: args.deployVersion,
    sourceSha: args.sourceSha || tagSha,
    tagSha,
    findings,
  };
}

function runProductionPolicyCheck(metadataCheck) {
  if (!metadataCheck.ok) {
    return {
      ok: false,
      status: STATUS.BLOCKED,
      code: metadataCheck.code,
      findings: [
        finding(
          "error",
          metadataCheck.code,
          "缺少业务仓项目事实，不能判断 production 发布策略",
        ),
      ],
    };
  }

  const deployment = metadataCheck.metadata.deployment ?? {};
  const environments = Array.isArray(deployment.environments)
    ? deployment.environments
    : [];
  const productionTrigger = String(deployment.productionTrigger ?? "").trim();
  const findings = [];

  if (!environments.includes("production")) {
    findings.push(
      finding(
        "error",
        CODES.INVALID_PROJECT_METADATA,
        "deployment.environments 必须包含 production",
      ),
    );
  }

  if (
    productionTrigger &&
    productionTrigger !== "business-repo-manual-promote"
  ) {
    findings.push(
      finding(
        "error",
        CODES.INVALID_PROJECT_METADATA,
        "productionTrigger 必须保持业务仓手动 promote",
        { productionTrigger },
      ),
    );
  }

  return {
    ok: findings.length === 0,
    status: findings.length === 0 ? STATUS.FRESH : STATUS.BLOCKED,
    code: findings.length === 0 ? CODES.OK : CODES.INVALID_PROJECT_METADATA,
    productionTrigger: productionTrigger || "business-repo-manual-promote",
    findings,
  };
}

function runTestingFreshnessCheck(rootDir, args, metadataCheck) {
  if (!args.factsFile) {
    return {
      ok: true,
      status: STATUS.SKIPPED,
      code: CODES.PRODUCTION_READINESS_SKIPPED,
      skipped: true,
      reason: "facts-file-not-provided",
      findings: [
        finding(
          "info",
          CODES.PRODUCTION_READINESS_SKIPPED,
          "未传入 --facts-file，已跳过 testing freshness 检查",
        ),
      ],
    };
  }

  if (!metadataCheck.ok) {
    return {
      ok: false,
      status: STATUS.BLOCKED,
      code: metadataCheck.code,
      findings: [
        finding(
          "error",
          metadataCheck.code,
          "缺少业务仓项目事实，不能判断 testing freshness",
        ),
      ],
    };
  }

  try {
    const report = readRuntimeFacts(path.resolve(rootDir, args.factsFile));
    assertRuntimeFactsSafe(report);
    assertRuntimeBindingMatches(metadataCheck.metadata, report);

    const [testing] = compareRuntimeLiveState(
      metadataCheck.metadata,
      report,
      ["testing"],
    );
    const findings = (testing.mismatches ?? []).map((mismatch) =>
      finding(
        "error",
        CODES.RUNTIME_FACTS_STALE,
        `testing.${mismatch.field} 与 runtime facts 不一致`,
        {
          field: mismatch.field,
          liveState: mismatch.expected,
          runtime: mismatch.actual,
        },
      ),
    );

    return {
      ok: testing.fresh,
      status: testing.fresh ? STATUS.FRESH : STATUS.BLOCKED,
      code: testing.fresh ? CODES.OK : CODES.RUNTIME_FACTS_STALE,
      environment: "testing",
      current: testing.current,
      observed: testing.observed,
      findings,
    };
  } catch (error) {
    return {
      ok: false,
      status: STATUS.BLOCKED,
      code: CODES.RUNTIME_FACTS_INVALID,
      error: errorMessage(error),
      findings: [
        finding(
          "error",
          CODES.RUNTIME_FACTS_INVALID,
          "testing runtime facts 无法用于 production readiness",
          { error: errorMessage(error) },
        ),
      ],
    };
  }
}

function flattenFindings(checks) {
  return Object.values(checks).flatMap((check) => check.findings ?? []);
}

function summarizeStatus(checks) {
  return Object.values(checks).some((check) => check.status === STATUS.BLOCKED)
    ? STATUS.BLOCKED
    : STATUS.FRESH;
}

function summarizeCode(status, checks) {
  if (status === STATUS.FRESH) {
    return CODES.OK;
  }

  for (const check of [
    checks.metadata,
    checks.productionPolicy,
    checks.version,
    checks.testingFreshness,
    checks.profile,
  ]) {
    if (!check.ok && check.code) {
      return check.code;
    }
  }

  return CODES.PRODUCTION_READINESS_INVALID;
}

function buildResult(rootDir, args) {
  const metadata = readMetadataCheck(rootDir);
  const profile = runProfileCheck(rootDir);
  const version = runVersionCheck(rootDir, args);
  const productionPolicy = runProductionPolicyCheck(metadata);
  const testingFreshness = runTestingFreshnessCheck(rootDir, args, metadata);
  const checks = {
    metadata,
    profile,
    version,
    productionPolicy,
    testingFreshness,
  };
  const status = summarizeStatus(checks);
  const findings = flattenFindings(checks);

  return {
    ok: Object.values(checks).every((check) => check.ok),
    status,
    code: summarizeCode(status, checks),
    rootDir,
    deployVersion: args.deployVersion,
    sourceSha: version.sourceSha,
    checks,
    findings,
  };
}

function renderHuman(result) {
  if (result.ok) {
    return [
      `production readiness: ${result.status}`,
      `deployVersion=${result.deployVersion}`,
      `sourceSha=${shortSha(result.sourceSha)}`,
    ].join("\n");
  }

  return [
    `production readiness: ${result.status}`,
    `code=${result.code}`,
    ...result.findings.map((item) => `- [${item.level}] ${item.code}: ${item.message}`),
  ].join("\n");
}

function renderMarkdown(result) {
  const lines = [
    "# RTNN Production Readiness",
    "",
    `- **Conclusion:** ${result.status}`,
    `- **Code:** ${result.code}`,
    `- **Deploy version:** ${result.deployVersion}`,
    `- **Source SHA:** ${shortSha(result.sourceSha) || "unknown"}`,
  ];

  if (result.findings.length > 0) {
    lines.push("", "## Findings");
    for (const item of result.findings) {
      lines.push(`- \`${item.level}\` \`${item.code}\` ${item.message}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function writeOutput(filePath, result) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(result, null, 2)}\n`);
}

try {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const result = buildResult(rootDir, args);

  if (args.outputFile) {
    writeOutput(path.resolve(rootDir, args.outputFile), result);
  }

  if (args.summaryMd) {
    console.log(renderMarkdown(result));
  } else if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderHuman(result));
  }

  if (!result.ok) {
    process.exit(1);
  }
} catch (error) {
  const message = errorMessage(error);
  if (process.argv.includes("--json")) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          status: STATUS.BLOCKED,
          code: CODES.PRODUCTION_READINESS_INVALID,
          error: message,
        },
        null,
        2,
      ),
    );
  } else {
    console.error(message);
  }
  process.exit(1);
}
