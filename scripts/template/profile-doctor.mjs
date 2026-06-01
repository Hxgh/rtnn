#!/usr/bin/env node

import path from "node:path";
import {
  PROJECT_METADATA_FILE,
  readProjectMetadata,
} from "../lib/project-metadata.mjs";
import { resolveProjectProfile } from "../lib/project-profile.mjs";

function usage() {
  return `用法:
  node scripts/template/profile-doctor.mjs [--root <dir>] [--json] [--strict]

选项:
  --root <dir>       项目根目录，默认当前目录
  --json             输出机器可读 JSON
  --strict           warnings 也按失败处理

说明:
  profile doctor 只读取 .rtnn/project.json 和 project profile，不写文件。
`;
}

function parseArgs(argv) {
  const args = {
    rootDir: process.cwd(),
    json: false,
    strict: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    switch (item) {
      case "--":
        break;
      case "--root":
        args.rootDir = path.resolve(String(argv[++index] ?? "."));
        break;
      case "--json":
        args.json = true;
        break;
      case "--strict":
        args.strict = true;
        break;
      case "--help":
      case "-h":
        console.log(usage());
        process.exit(0);
      default:
        throw new Error(`未知参数: ${item}`);
    }
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

function buildFindings(rootDir, metadata, profile) {
  const findings = [];

  if (!metadata) {
    findings.push(
      finding(
        "info",
        "template-default-profile",
        `未发现 ${PROJECT_METADATA_FILE}，当前按模板默认 full profile 检查`,
      ),
    );
  }

  if (profile.isBusinessSource && !profile.deliveryConfigured) {
    findings.push(
      finding(
        "warn",
        "delivery-not-configured",
        "业务源码仓未显式声明 delivery 配置，当前仍按兼容模式启用全部服务交付面",
      ),
    );
  }

  if (profile.enabledServices.length === 0) {
    findings.push(
      finding(
        "error",
        "no-enabled-services",
        "当前 profile 未启用任何服务交付面",
      ),
    );
  }

  for (const warning of profile.warnings) {
    findings.push(finding("warn", "profile-warning", warning));
  }

  for (const clientName of profile.enabledClients) {
    const client = profile.clients[clientName];
    const enabledTargets = Object.entries(client.targetProfiles)
      .filter(([, target]) => target.enabled)
      .map(([target]) => target);
    if (enabledTargets.length === 0) {
      findings.push(
        finding(
          "warn",
          "client-build-targets-disabled",
          `${clientName} 已启用，但没有可执行的客户端构建目标`,
          {
            disabledReasons: Object.fromEntries(
              Object.entries(client.targetProfiles).map(
                ([target, targetProfile]) => [target, targetProfile.reason],
              ),
            ),
          },
        ),
      );
    }
    if (!client.webUrl && Object.keys(client.webUrls).length === 0) {
      findings.push(
        finding(
          "warn",
          "client-web-url-missing",
          `${clientName} 已启用，但未配置 delivery.clients.*.webUrl 或 webUrls；发布上下文需要从 domains 推导或显式补齐`,
        ),
      );
    }
  }

  if (profile.releaseExecution.effectiveMode === "github-hosted") {
    const githubHosted = profile.releaseExecution.githubHosted;
    if (githubHosted.requiresExplicitOptIn && !githubHosted.enabled) {
      findings.push(
        finding(
          "warn",
          "github-hosted-not-persisted",
          "当前请求了 github-hosted 执行模式，但 project profile 未持久启用 releaseExecution.githubHosted.enabled",
        ),
      );
    }
  }

  return findings;
}

function summarizeTargets(targets) {
  return targets
    .map(
      (item) =>
        `${item.client}:${item.target}@${item.runnerKind || item.executionMode}`,
    )
    .join(", ");
}

function printHuman(result) {
  const profile = result.profile;
  console.log(
    `[profile-doctor] root=${result.rootDir} source=${profile.source} role=${profile.projectRole} deliveryConfigured=${profile.deliveryConfigured}`,
  );
  console.log(
    `[profile-doctor] services enabled=${profile.enabledServices.join(", ") || "-"} disabled=${profile.disabledServices.join(", ") || "-"}`,
  );
  console.log(
    `[profile-doctor] clients enabled=${profile.enabledClients.join(", ") || "-"} disabled=${profile.disabledClients.join(", ") || "-"}`,
  );
  console.log(
    `[profile-doctor] clientBuildTargets=${summarizeTargets(profile.enabledClientBuildTargets) || "-"}`,
  );

  for (const item of result.findings) {
    console.log(
      `[profile-doctor] ${item.level}: ${item.code} - ${item.message}`,
    );
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = path.resolve(args.rootDir);
  const metadata = readProjectMetadata(rootDir);
  const profile = resolveProjectProfile(rootDir);
  const findings = buildFindings(rootDir, metadata, profile);
  const errorCount = findings.filter((item) => item.level === "error").length;
  const warnCount = findings.filter((item) => item.level === "warn").length;
  const ok = errorCount === 0 && (!args.strict || warnCount === 0);
  const result = {
    ok,
    rootDir,
    strict: args.strict,
    summary: {
      errorCount,
      warnCount,
      infoCount: findings.filter((item) => item.level === "info").length,
    },
    profile,
    findings,
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHuman(result);
  }

  if (!ok) {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
