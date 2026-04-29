import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

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

function copyFiles(files, sourceRoot, outputRoot) {
  const copied = [];

  for (const filePath of files) {
    const relativePath = path.relative(sourceRoot, filePath);
    const outputPath = path.join(outputRoot, relativePath);
    mkdirSync(path.dirname(outputPath), { recursive: true });
    copyFileSync(filePath, outputPath);
    copied.push({
      path: relativePath,
      size: statSync(filePath).size,
    });
  }

  return copied;
}

function main() {
  const clientDir = requireEnv("CLIENT_DIR");
  const artifactName = requireEnv("CLIENT_ARTIFACT_NAME");
  const bundleDir = normalizeString(
    process.env.CLIENT_BUNDLE_DIR,
    path.join(clientDir, "src-tauri", "target", "release", "bundle"),
  );
  const outputRoot = normalizeString(
    process.env.CLIENT_ARTIFACT_OUTPUT_DIR,
    path.join("artifacts", "client-release", artifactName, "bundle"),
  );
  const manifestPath = path.join(outputRoot, "artifact-files.json");
  const files = walkFiles(bundleDir);

  if (files.length === 0) {
    throw new Error(`未找到客户端 bundle 产物: ${bundleDir}`);
  }

  mkdirSync(outputRoot, { recursive: true });
  const copied = copyFiles(files, bundleDir, outputRoot);
  writeFileSync(manifestPath, `${JSON.stringify({ files: copied }, null, 2)}\n`);
  console.log(`[client-artifacts] ${copied.length} files -> ${outputRoot}`);
}

main();
