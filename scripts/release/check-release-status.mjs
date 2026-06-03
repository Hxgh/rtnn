#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  assertRuntimeBindingMatches,
  assertRuntimeFactsSafe,
  compareClientLiveState,
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
  node scripts/release/check-release-status.mjs --facts-file <runtime-facts.json> [options]

选项:
  --facts-file <file>            独立部署执行仓生成的 runtime facts JSON
  --environment <name>           只检查某个环境，可重复或用逗号分隔
  --client-artifacts-dir <dir>   release-clients workflow 产出的 artifacts/client-release 目录
  --skip-profile                 跳过 profile doctor 预检
  --strict-profile               profile doctor warnings 也按失败处理
  --json                         输出机器可读 JSON
  --summary-md                   输出可用于 PR comment 的 Markdown 摘要
  --output <file>                将 JSON 结果写入文件

说明:
  本脚本是回答“线上是否最新”的只读入口。它只读取 deploy runtime facts、
  客户端 release facts 与 .rtnn/project.json，不写回 liveState。
  如需写回 runtime liveState，使用 release:sync-live-state。
  如需写回客户端 liveState，使用 release:sync-client-live-state。
`;
}

function parseArgs(argv) {
  const args = {
    factsFile: "",
    environments: [],
    clientArtifactsDir: "",
    skipProfile: false,
    strictProfile: false,
    json: false,
    summaryMd: false,
    outputFile: "",
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
      case "--client-artifacts-dir":
        args.clientArtifactsDir = String(argv[++index] ?? "").trim();
        break;
      case "--skip-profile":
        args.skipProfile = true;
        break;
      case "--strict-profile":
        args.strictProfile = true;
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

  args.environments = args.environments
    .map((environment) => environment.trim())
    .filter(Boolean);

  if (!args.factsFile) {
    throw new Error("必须传入 --facts-file；线上状态只能从 deploy runtime facts 判断");
  }

  if (!existsSync(args.factsFile)) {
    throw new Error(`runtime facts 文件不存在: ${args.factsFile}`);
  }

  if (args.clientArtifactsDir && !existsSync(args.clientArtifactsDir)) {
    throw new Error(`客户端 release artifacts 目录不存在: ${args.clientArtifactsDir}`);
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

function isProfileWarning(profile) {
  return profile.isBusinessSource && !profile.deliveryConfigured;
}

function runProfileCheck(rootDir, args) {
  if (args.skipProfile) {
    return {
      ok: true,
      status: STATUS.SKIPPED,
      code: CODES.OK,
      skipped: true,
      reason: "skip-profile",
      findings: [
        finding(
          "info",
          CODES.PROFILE_SKIPPED,
          "profile doctor 预检已按参数跳过",
        ),
      ],
    };
  }

  try {
    const profile = resolveProjectProfile(rootDir);
    const findings = [];

    if (isProfileWarning(profile)) {
      findings.push(
        finding(
          "warn",
          CODES.PROFILE_WARNING,
          "业务源码仓未显式声明 delivery 配置，当前仍按兼容模式启用全部服务交付面",
        ),
      );
    }

    for (const warning of profile.warnings ?? []) {
      findings.push(finding("warn", CODES.PROFILE_WARNING, warning));
    }

    const warningCount = findings.filter((item) => item.level === "warn").length;
    const ok = !args.strictProfile || warningCount === 0;

    return {
      ok,
      status: ok ? STATUS.FRESH : STATUS.BLOCKED,
      code: ok ? CODES.OK : CODES.PROFILE_WARNING,
      summary: {
        warningCount,
        errorCount: 0,
      },
      profile: {
        source: profile.source,
        projectRole: profile.projectRole,
        deliveryConfigured: profile.deliveryConfigured,
        enabledServices: profile.enabledServices,
        enabledClients: profile.enabledClients,
        enabledClientBuildTargets: profile.enabledClientBuildTargets,
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

function readValidatedMetadata(rootDir) {
  const metadataPath = path.join(rootDir, PROJECT_METADATA_FILE);
  if (!readProjectMetadata(rootDir)) {
    return {
      ok: false,
      code: CODES.MISSING_PROJECT_METADATA,
      error: `缺少项目事实文件: ${metadataPath}`,
      metadata: null,
    };
  }

  try {
    return {
      ok: true,
      code: CODES.OK,
      metadata: validateBusinessProjectMetadata(rootDir, {
        requireConcreteRepositories: true,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      code: CODES.INVALID_PROJECT_METADATA,
      error: errorMessage(error),
      metadata: null,
    };
  }
}

function runRuntimeCheck(rootDir, args, metadataResult) {
  if (!metadataResult.ok) {
    return {
      ok: false,
      status: STATUS.BLOCKED,
      code: metadataResult.code,
      error: metadataResult.error,
      findings: [
        finding(
          "error",
          metadataResult.code,
          "无法读取业务仓项目事实，不能判断线上运行状态",
          { error: metadataResult.error },
        ),
      ],
    };
  }

  let report;
  try {
    report = readRuntimeFacts(path.resolve(rootDir, args.factsFile));
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
          "runtime facts 无法解析",
          { error: errorMessage(error) },
        ),
      ],
    };
  }

  try {
    assertRuntimeFactsSafe(report);
  } catch (error) {
    return {
      ok: false,
      status: STATUS.BLOCKED,
      code: CODES.RUNTIME_FACTS_UNSAFE,
      error: errorMessage(error),
      findings: [
        finding(
          "error",
          CODES.RUNTIME_FACTS_UNSAFE,
          "runtime facts 包含疑似敏感字段",
          { error: errorMessage(error) },
        ),
      ],
    };
  }

  try {
    assertRuntimeBindingMatches(metadataResult.metadata, report);
  } catch (error) {
    return {
      ok: false,
      status: STATUS.BLOCKED,
      code: CODES.RUNTIME_BINDING_MISMATCH,
      error: errorMessage(error),
      findings: [
        finding(
          "error",
          CODES.RUNTIME_BINDING_MISMATCH,
          "runtime facts 绑定关系与业务仓不一致",
          { error: errorMessage(error) },
        ),
      ],
    };
  }

  try {
    const environments = compareRuntimeLiveState(
      metadataResult.metadata,
      report,
      args.environments,
    );
    const staleEnvironments = environments.filter((item) => !item.fresh);
    const findings = staleEnvironments.flatMap((environment) =>
      environment.mismatches.map((mismatch) =>
        finding(
          "error",
          CODES.RUNTIME_FACTS_STALE,
          `${environment.environment}.${mismatch.field} 与 runtime facts 不一致`,
          {
            environment: environment.environment,
            field: mismatch.field,
            liveState: mismatch.expected,
            runtime: mismatch.actual,
            ...(mismatch.reason ? { reason: mismatch.reason } : {}),
          },
        ),
      ),
    );

    return {
      ok: staleEnvironments.length === 0,
      status:
        staleEnvironments.length === 0 ? STATUS.FRESH : STATUS.STALE,
      code:
        staleEnvironments.length === 0
          ? CODES.OK
          : CODES.RUNTIME_FACTS_STALE,
      project: {
        repo: metadataResult.metadata.project.repo,
        deploymentRepo: metadataResult.metadata.deployment.repo,
        application: metadataResult.metadata.deployment.application,
      },
      environments,
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
          "runtime facts 环境数据无法比较",
          { error: errorMessage(error) },
        ),
      ],
    };
  }
}

function resolveClientEnvironments(args, runtimeCheck) {
  if (args.environments.length > 0) {
    return args.environments;
  }

  return (runtimeCheck.environments ?? [])
    .map((environment) => String(environment.environment ?? "").trim())
    .filter(Boolean);
}

function runClientLiveStateCheck(rootDir, args, metadataResult, runtimeCheck) {
  if (!args.clientArtifactsDir) {
    return {
      ok: true,
      status: STATUS.SKIPPED,
      code: CODES.CLIENT_LIVE_STATE_SKIPPED,
      skipped: true,
      reason: "client-artifacts-dir-not-provided",
      findings: [
        finding(
          "info",
          CODES.CLIENT_LIVE_STATE_SKIPPED,
          "未传入 --client-artifacts-dir，已跳过客户端 release liveState 检查",
        ),
      ],
    };
  }

  if (!metadataResult.ok) {
    return {
      ok: false,
      status: STATUS.BLOCKED,
      code: metadataResult.code,
      error: metadataResult.error,
      findings: [
        finding(
          "error",
          metadataResult.code,
          "无法读取业务仓项目事实，不能判断客户端 liveState",
          { error: metadataResult.error },
        ),
      ],
    };
  }

  const environments = resolveClientEnvironments(args, runtimeCheck);
  if (environments.length === 0) {
    return {
      ok: false,
      status: STATUS.BLOCKED,
      code: CODES.RUNTIME_FACTS_INVALID,
      error: "无法确定客户端 liveState 环境；请传入 --environment <name>",
      findings: [
        finding(
          "error",
          CODES.RUNTIME_FACTS_INVALID,
          "无法确定客户端 liveState 环境；请传入 --environment <name>",
        ),
      ],
    };
  }

  const results = environments.map((environment) => {
    try {
      const comparison = compareClientLiveState(
        metadataResult.metadata,
        path.resolve(rootDir, args.clientArtifactsDir),
        environment,
      );
      return {
        ok: comparison.ok,
        status: comparison.ok ? STATUS.FRESH : STATUS.STALE,
        code: comparison.ok ? CODES.OK : CODES.CLIENT_LIVE_STATE_STALE,
        environment,
        changeCount: comparison.changeCount,
        changes: comparison.changes,
      };
    } catch (error) {
      return {
        ok: false,
        status: STATUS.BLOCKED,
        code: CODES.CLIENT_ARTIFACTS_INVALID,
        environment,
        error: errorMessage(error),
      };
    }
  });

  const findings = results.flatMap((result) => {
    if (result.code === CODES.CLIENT_ARTIFACTS_INVALID) {
      return [
        finding(
          "error",
          CODES.CLIENT_ARTIFACTS_INVALID,
          `${result.environment} 客户端 release artifacts 无法解析`,
          { environment: result.environment, error: result.error },
        ),
      ];
    }

    return (result.changes ?? []).map((change) =>
      finding(
        "error",
        CODES.CLIENT_LIVE_STATE_STALE,
        `${result.environment}.clients.${change.client}.${change.target} 与客户端 release facts 不一致`,
        {
          environment: result.environment,
          client: change.client,
          target: change.target,
        },
      ),
    );
  });

  const ok = results.every((result) => result.ok);
  const blocked = results.some((result) => result.status === STATUS.BLOCKED);

  return {
    ok,
    status: ok ? STATUS.FRESH : blocked ? STATUS.BLOCKED : STATUS.STALE,
    code: ok
      ? CODES.OK
      : blocked
        ? CODES.CLIENT_ARTIFACTS_INVALID
        : CODES.CLIENT_LIVE_STATE_STALE,
    artifactsDir: args.clientArtifactsDir,
    environments: results,
    findings,
  };
}

function flattenFindings(checks) {
  return Object.values(checks).flatMap((check) => check.findings ?? []);
}

function summarizeStatus(checks) {
  if (Object.values(checks).some((check) => check.status === STATUS.BLOCKED)) {
    return STATUS.BLOCKED;
  }

  if (Object.values(checks).some((check) => check.status === STATUS.STALE)) {
    return STATUS.STALE;
  }

  return STATUS.FRESH;
}

function summarizeCode(status, checks) {
  if (status === STATUS.FRESH) {
    return CODES.OK;
  }

  for (const check of [
    checks.runtime,
    checks.clientLiveState,
    checks.profile,
  ]) {
    if (!check.ok && check.code) {
      return check.code;
    }
  }

  return status === STATUS.STALE
    ? CODES.RUNTIME_FACTS_STALE
    : CODES.RUNTIME_FACTS_INVALID;
}

function buildResult(rootDir, args) {
  const metadataResult = readValidatedMetadata(rootDir);
  const profile = runProfileCheck(rootDir, args);
  const runtime = runRuntimeCheck(rootDir, args, metadataResult);
  const clientLiveState = runClientLiveStateCheck(
    rootDir,
    args,
    metadataResult,
    runtime,
  );
  const checks = {
    profile,
    runtime,
    clientLiveState,
  };
  const status = summarizeStatus(checks);
  const findings = flattenFindings(checks);

  return {
    ok: Object.values(checks).every((check) => check.ok),
    status,
    code: summarizeCode(status, checks),
    rootDir,
    summary: {
      status,
      findingCount: findings.length,
      errorCount: findings.filter((item) => item.level === "error").length,
      warningCount: findings.filter((item) => item.level === "warn").length,
      infoCount: findings.filter((item) => item.level === "info").length,
    },
    checks,
    findings,
  };
}

function markdownEscape(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function buildSummaryMarkdown(result) {
  const lines = [
    "## RTNN Release Status",
    "",
    `**Conclusion:** ${result.status}`,
    "",
    "| Check | Status | Code | Notes |",
    "| --- | --- | --- | --- |",
  ];

  for (const [name, check] of Object.entries(result.checks)) {
    lines.push(
      `| ${markdownEscape(name)} | ${markdownEscape(check.status)} | ${markdownEscape(check.code)} | ${markdownEscape(check.error ?? check.reason ?? "-")} |`,
    );
  }

  if (result.findings.length > 0) {
    lines.push("", "### Findings", "");
    for (const item of result.findings.slice(0, 20)) {
      lines.push(`- \`${item.code}\` ${item.message}`);
    }
    if (result.findings.length > 20) {
      lines.push(`- ... ${result.findings.length - 20} more`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function printHuman(result) {
  console.log(`[release-status] root=${result.rootDir}`);
  console.log(`[release-status] conclusion=${result.status}`);

  const profile = result.checks.profile;
  console.log(
    `[release-status] profile: ${profile.status} code=${profile.code} services=${profile.profile?.enabledServices?.join(",") || "-"} clients=${profile.profile?.enabledClients?.join(",") || "-"}`,
  );

  const runtime = result.checks.runtime;
  console.log(
    `[release-status] runtime: ${runtime.status} code=${runtime.code} project=${runtime.project?.repo ?? "-"}`,
  );
  for (const environment of runtime.environments ?? []) {
    const status = environment.fresh ? "fresh" : "stale";
    const health = Object.entries(environment.observed?.health ?? {})
      .filter(([, value]) => value)
      .map(([key]) => key)
      .join(",");

    console.log(
      `[release-status] runtime.${environment.environment}: ${status} live=${environment.current?.activeRelease || "-"} runtime=${environment.observed?.activeRelease || "-"} sha=${environment.observed?.sourceSha || "-"} health=${health || "-"}`,
    );
  }

  const clientLiveState = result.checks.clientLiveState;
  console.log(
    `[release-status] client-live-state: ${clientLiveState.status} code=${clientLiveState.code}`,
  );
  for (const environment of clientLiveState.environments ?? []) {
    console.log(
      `[release-status] client-live-state.${environment.environment}: ${environment.status} changes=${environment.changeCount ?? 0}`,
    );
  }

  for (const item of result.findings) {
    console.log(`[release-status] ${item.level}: ${item.code} - ${item.message}`);
  }
}

function writeOutputFile(outputFile, result) {
  if (!outputFile) {
    return;
  }

  const resolved = path.resolve(process.cwd(), outputFile);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(result, null, 2)}\n`);
}

try {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const result = buildResult(rootDir, args);

  writeOutputFile(args.outputFile, result);

  if (args.summaryMd) {
    console.log(buildSummaryMarkdown(result));
  } else if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHuman(result);
  }

  if (!result.ok) {
    process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
