import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const PROJECT_METADATA_FILE = ".rtnn/project.json";

function runGit(args) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} 执行失败`);
  }

  return result.stdout;
}

function readJsonIfExists(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }

  return JSON.parse(readFileSync(filePath, "utf8"));
}

function buildForbiddenPatterns() {
  const demoRepoName = ["rtnn", "demo"].join("-");
  const realDomain = ["soolan", "xyz"].join(".");
  const ghcrOwner = ["ghcr.io", "hxgh"].join("/");
  const githubOwner = "Hxgh";
  const runtimeRoot = ["", "home", "rtnn"].join("/");

  return [
    {
      pattern: new RegExp(`\\b${demoRepoName}\\b`, "i"),
      reason: "模板仓不应固化具体业务仓名称",
    },
    {
      pattern: new RegExp(realDomain.replace(".", "\\."), "i"),
      reason: "模板仓不应固化真实业务域名",
    },
    {
      pattern: new RegExp(ghcrOwner.replace("/", "\\/"), "i"),
      reason: "模板仓不应固化具体 GHCR owner",
    },
    {
      pattern: new RegExp(`${githubOwner}\\/${demoRepoName}`, "i"),
      reason: "模板仓不应固化具体业务 GitHub 仓库",
    },
    {
      pattern: new RegExp(`${githubOwner}\\/${["rtnn", "deploy"].join("-")}`, "i"),
      reason: "模板仓不应固化具体部署执行仓 owner",
    },
    {
      pattern: new RegExp(`${runtimeRoot.replaceAll("/", "\\/")}\\b`, "i"),
      reason: "模板仓不应固化具体服务器运行目录",
    },
  ];
}

function listTrackedFiles() {
  return runGit(["ls-files", "-z"])
    .split("\0")
    .map((item) => item.trim())
    .filter(Boolean);
}

function shouldSkipFile(filePath) {
  return (
    filePath === "pnpm-lock.yaml" ||
    filePath.startsWith("node_modules/") ||
    filePath.includes("/node_modules/") ||
    filePath.startsWith(".git/") ||
    filePath.includes("/.next/") ||
    filePath.includes("/dist/") ||
    filePath.includes("/build/")
  );
}

function scanFile(filePath, patterns) {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const findings = [];

  for (const [index, line] of lines.entries()) {
    for (const { pattern, reason } of patterns) {
      if (pattern.test(line)) {
        findings.push({
          filePath,
          line: index + 1,
          reason,
          text: line.trim(),
        });
      }
    }
  }

  return findings;
}

function main() {
  const rootDir = process.cwd();
  const metadataPath = path.join(rootDir, PROJECT_METADATA_FILE);
  const metadata = readJsonIfExists(metadataPath);

  if (metadata?.project?.role === "business-source") {
    console.log("[template-neutrality] 当前仓库声明为 business-source，跳过模板中立性扫描");
    return;
  }

  if (metadata) {
    throw new Error(`模板源码仓不应提交 ${PROJECT_METADATA_FILE}；业务项目事实应留在业务仓`);
  }

  const patterns = buildForbiddenPatterns();
  const findings = [];

  for (const filePath of listTrackedFiles()) {
    if (shouldSkipFile(filePath)) {
      continue;
    }

    try {
      findings.push(...scanFile(path.join(rootDir, filePath), patterns));
    } catch {
      // 非文本文件不参与模板污染扫描。
    }
  }

  if (findings.length > 0) {
    for (const finding of findings) {
      const relativePath = path.relative(rootDir, finding.filePath);
      console.error(
        `[template-neutrality] ${relativePath}:${finding.line} ${finding.reason}: ${finding.text}`,
      );
    }
    throw new Error("模板中立性校验失败");
  }

  console.log("[template-neutrality] 模板中立性校验通过");
}

main();
