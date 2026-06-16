import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const backendSrc = resolve(repoRoot, "apps/backend/src");
const auditTypesSource = readFileSync(
  resolve(repoRoot, "packages/shared-types/src/audit.ts"),
  "utf8",
);
const auditActionsBlock = readConstObjectBlock(auditTypesSource, "AUDIT_ACTIONS");
const registeredActionNames = new Set(
  [...auditActionsBlock.matchAll(/^\s*([A-Za-z0-9_]+)\s*:/gm)].map(
    (match) => match[1],
  ),
);
const issues = [];

for (const filePath of listBackendSourceFiles(backendSrc)) {
  const source = readFileSync(filePath, "utf8");
  if (!source.includes("auditWriter.write")) {
    continue;
  }
  const calls = source.matchAll(/auditWriter\.write\(\s*\{[\s\S]*?action\s*:\s*([^,\n}]+)/g);
  for (const match of calls) {
    const expression = match[1].trim();
    const line = source.slice(0, match.index ?? 0).split("\n").length;
    if (/^['"]/.test(expression)) {
      issues.push({
        filePath,
        line,
        message: `audit action must use AUDIT_ACTIONS, got literal ${expression}`,
      });
      continue;
    }
    const actionNameMatch = expression.match(/^AUDIT_ACTIONS\.([A-Za-z0-9_]+)$/);
    if (!actionNameMatch) {
      issues.push({
        filePath,
        line,
        message: `audit action must be a direct AUDIT_ACTIONS member, got ${expression}`,
      });
      continue;
    }
    if (!registeredActionNames.has(actionNameMatch[1])) {
      issues.push({
        filePath,
        line,
        message: `unknown AUDIT_ACTIONS member ${actionNameMatch[1]}`,
      });
    }
  }
}

if (issues.length > 0) {
  console.error("Audit action contract check failed:");
  for (const issue of issues) {
    console.error(
      `- ${relative(repoRoot, issue.filePath)}:${issue.line} ${issue.message}`,
    );
  }
  process.exit(1);
}

console.log("[contracts] audit action registry OK");

function listBackendSourceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const filePath = resolve(dir, entry);
    const stats = statSync(filePath);
    if (stats.isDirectory()) {
      files.push(...listBackendSourceFiles(filePath));
      continue;
    }
    if (
      stats.isFile() &&
      filePath.endsWith(".ts") &&
      !filePath.endsWith(".spec.ts")
    ) {
      files.push(filePath);
    }
  }
  return files;
}

function readConstObjectBlock(source, exportName) {
  const exportIndex = source.indexOf(`export const ${exportName}`);
  if (exportIndex < 0) {
    throw new Error(`Missing ${exportName} export`);
  }
  const objectStart = source.indexOf("{", exportIndex);
  const objectEnd = source.indexOf("} as const", objectStart);
  if (objectStart < 0 || objectEnd < 0) {
    throw new Error(`Could not parse ${exportName}`);
  }
  return source.slice(objectStart + 1, objectEnd);
}
