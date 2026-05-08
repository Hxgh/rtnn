import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const BLOCKED_URL_SNIPPETS = Object.freeze([
  "http://localhost",
  "https://localhost",
  "localhost:5101",
  "localhost:5102",
  "http://0.0.0.0",
  "https://0.0.0.0",
  "0.0.0.0:5101",
  "0.0.0.0:5102",
  "http://127.0.0.1",
  "https://127.0.0.1",
  "127.0.0.1:5101",
  "127.0.0.1:5102",
  "https://app.example.com",
  "https://admin.example.com",
  "http://app.example.com",
  "http://admin.example.com",
  ".example.com",
  ".example.net",
  ".example.org",
  "app.rtnn.invalid",
  "admin.rtnn.invalid",
]);

function normalizeString(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function requireEnv(name) {
  const value = normalizeString(process.env[name]);
  if (!value) {
    throw new Error(`缺少环境变量: ${name}`);
  }

  return value;
}

function walkFiles(rootDir) {
  if (!existsSync(rootDir)) {
    return [];
  }

  const files = [];
  const entries = readdirSync(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

function findMatches(filePath, snippets) {
  const content = readFileSync(filePath);
  const matches = [];

  for (const snippet of snippets) {
    if (content.indexOf(Buffer.from(snippet)) !== -1) {
      matches.push(snippet);
    }
  }

  return matches;
}

function writeReport(reportPath, report) {
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function main() {
  const artifactName = requireEnv("CLIENT_ARTIFACT_NAME");
  const scanDir = requireEnv("CLIENT_ARTIFACT_SCAN_DIR");
  const outputRoot = normalizeString(
    process.env.CLIENT_RELEASE_MANIFEST_DIR,
    "artifacts/client-release",
  );
  const reportPath = path.join(
    outputRoot,
    "artifact-url-checks",
    `${artifactName}.json`,
  );

  if (!existsSync(scanDir)) {
    throw new Error(`客户端产物扫描目录不存在: ${scanDir}`);
  }

  const files = walkFiles(scanDir);
  if (files.length === 0) {
    throw new Error(`客户端产物扫描目录为空: ${scanDir}`);
  }

  const blockedMatches = files
    .map((filePath) => ({
      path: path.relative(scanDir, filePath),
      size: statSync(filePath).size,
      matches: findMatches(filePath, BLOCKED_URL_SNIPPETS),
    }))
    .filter((item) => item.matches.length > 0);

  const report = {
    schemaVersion: "rtnn.client-artifact-url-check.v1",
    artifactName,
    scanDir,
    checkedFiles: files.length,
    blockedMatches,
  };

  writeReport(reportPath, report);

  if (blockedMatches.length > 0) {
    throw new Error(
      `客户端产物包含本地开发或模板占位 URL: ${blockedMatches
        .map((item) => `${item.path}(${item.matches.join(",")})`)
        .join("; ")}`,
    );
  }

  console.log(`[client-artifact-url-check] ${files.length} files ok -> ${reportPath}`);
}

main();
