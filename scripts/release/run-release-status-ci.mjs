#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function usage() {
  return `用法:
  node scripts/release/run-release-status-ci.mjs --facts-file <runtime-facts.json> [options]
  node scripts/release/run-release-status-ci.mjs --skip-runtime --client-facts-file <client-facts.json> --environment <name> [options]

选项:
  --facts-file <file>            deploy 仓生成的 runtime facts JSON
  --skip-runtime                 跳过 runtime 检查，仅检查客户端 facts/liveState
  --environment <name>           只检查某个环境，可重复或用逗号分隔
  --client-artifacts-dir <dir>   可选 client release artifacts 目录
  --client-facts-file <file>     deploy 仓生成的 rtnn.deploy.client-release-facts.v1 JSON
  --output-dir <dir>             输出目录，默认 artifacts/release-status
  --strict-profile               profile warning 也按失败处理
  --skip-profile                 跳过 profile 预检

说明:
  CI 入口只编排 release:status 输出，不写回 liveState。
  输出目录会包含 release-status.json 与 release-status.md。
`;
}

function parseArgs(argv) {
  const args = {
    factsFile: "",
    skipRuntime: false,
    environments: [],
    clientArtifactsDir: "",
    clientFactsFile: "",
    outputDir: "artifacts/release-status",
    strictProfile: false,
    skipProfile: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];

    switch (item) {
      case "--facts-file":
        args.factsFile = String(argv[++index] ?? "").trim();
        break;
      case "--skip-runtime":
        args.skipRuntime = true;
        break;
      case "--environment":
        args.environments.push(...String(argv[++index] ?? "").split(","));
        break;
      case "--client-artifacts-dir":
        args.clientArtifactsDir = String(argv[++index] ?? "").trim();
        break;
      case "--client-facts-file":
        args.clientFactsFile = String(argv[++index] ?? "").trim();
        break;
      case "--output-dir":
        args.outputDir = String(argv[++index] ?? "").trim();
        break;
      case "--strict-profile":
        args.strictProfile = true;
        break;
      case "--skip-profile":
        args.skipProfile = true;
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

  if (!args.skipRuntime && !args.factsFile) {
    throw new Error("必须传入 --facts-file");
  }

  if (args.skipRuntime && args.factsFile) {
    throw new Error("--skip-runtime 不能与 --facts-file 同时使用");
  }

  if (args.factsFile && !existsSync(args.factsFile)) {
    throw new Error(`runtime facts 文件不存在: ${args.factsFile}`);
  }

  if (args.clientArtifactsDir && !existsSync(args.clientArtifactsDir)) {
    throw new Error(`客户端 release artifacts 目录不存在: ${args.clientArtifactsDir}`);
  }

  if (args.clientFactsFile && !existsSync(args.clientFactsFile)) {
    throw new Error(`客户端 facts 文件不存在: ${args.clientFactsFile}`);
  }

  if (args.clientArtifactsDir && args.clientFactsFile) {
    throw new Error("--client-artifacts-dir 不能与 --client-facts-file 同时使用");
  }

  if (args.skipRuntime && !args.clientArtifactsDir && !args.clientFactsFile) {
    throw new Error("--skip-runtime 必须搭配客户端 facts 输入");
  }

  if (args.skipRuntime && args.environments.length === 0) {
    throw new Error("--skip-runtime 必须传入 --environment");
  }

  return args;
}

function runStatus(args, jsonPath) {
  const commandArgs = [
    path.join(ROOT_DIR, "scripts/release/check-release-status.mjs"),
    "--json",
    "--output",
    jsonPath,
  ];

  if (args.skipRuntime) {
    commandArgs.push("--skip-runtime");
  } else {
    commandArgs.push("--facts-file", args.factsFile);
  }

  for (const environment of args.environments) {
    commandArgs.push("--environment", environment);
  }

  if (args.clientArtifactsDir) {
    commandArgs.push("--client-artifacts-dir", args.clientArtifactsDir);
  }

  if (args.clientFactsFile) {
    commandArgs.push("--client-facts-file", args.clientFactsFile);
  }

  if (args.strictProfile) {
    commandArgs.push("--strict-profile");
  }

  if (args.skipProfile) {
    commandArgs.push("--skip-profile");
  }

  return spawnSync(process.execPath, commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function readJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function markdownEscape(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function buildMarkdown(result) {
  const lines = [
    "## RTNN Release Status",
    "",
    `**Conclusion:** ${result.status}`,
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Status | ${markdownEscape(result.status)} |`,
    `| Code | ${markdownEscape(result.code)} |`,
    `| Errors | ${markdownEscape(result.summary?.errorCount ?? 0)} |`,
    `| Warnings | ${markdownEscape(result.summary?.warningCount ?? 0)} |`,
    "",
    "| Check | Status | Code | Notes |",
    "| --- | --- | --- | --- |",
  ];

  for (const [name, check] of Object.entries(result.checks ?? {})) {
    lines.push(
      `| ${markdownEscape(name)} | ${markdownEscape(check.status)} | ${markdownEscape(check.code)} | ${markdownEscape(check.error ?? check.reason ?? "-")} |`,
    );
  }

  if ((result.findings ?? []).length > 0) {
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

function writeGithubOutput(result, outputDir) {
  if (!process.env.GITHUB_OUTPUT) {
    return;
  }

  appendFileSync(
    process.env.GITHUB_OUTPUT,
    [
      `ok=${result.ok ? "true" : "false"}`,
      `status=${result.status}`,
      `code=${result.code}`,
      `output_dir=${outputDir}`,
      "",
    ].join("\n"),
  );
}

function appendStepSummary(markdown) {
  if (!process.env.GITHUB_STEP_SUMMARY) {
    return;
  }

  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n${markdown}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = path.resolve(process.cwd(), args.outputDir);
  const jsonPath = path.join(outputDir, "release-status.json");
  const markdownPath = path.join(outputDir, "release-status.md");
  mkdirSync(outputDir, { recursive: true });

  const statusRun = runStatus(args, jsonPath);
  if (statusRun.stderr) {
    process.stderr.write(statusRun.stderr);
  }

  let result;
  if (existsSync(jsonPath)) {
    result = readJsonFile(jsonPath);
  } else {
    throw new Error(statusRun.stderr || "release:status 未写出 JSON 结果");
  }

  const markdown = buildMarkdown(result);
  writeFileSync(markdownPath, markdown);
  writeGithubOutput(result, args.outputDir);
  appendStepSummary(markdown);

  const payload = {
    ok: result.ok,
    status: result.status,
    code: result.code,
    outputDir: args.outputDir,
    jsonPath,
    markdownPath,
  };

  console.log(JSON.stringify(payload, null, 2));

  if (statusRun.status !== 0) {
    process.exit(statusRun.status ?? 1);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
