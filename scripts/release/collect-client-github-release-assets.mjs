import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const SKIPPED_ASSET_NAMES = new Set(["artifact-files.json", "asset-files.json"]);
const PUBLISHABLE_BUNDLE_EXTENSIONS = [
  ".apk",
  ".aab",
  ".ipa",
  ".msi",
  ".exe",
  ".dmg",
  ".app.tar.gz",
  ".AppImage",
  ".deb",
  ".rpm",
  ".zip",
];

function normalizeString(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function walkFiles(rootDir) {
  if (!existsSync(rootDir)) {
    return [];
  }

  const files = [];
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

function shouldPublishAsset(filePath) {
  const name = path.basename(filePath);
  if (SKIPPED_ASSET_NAMES.has(name)) {
    return false;
  }

  if (name.endsWith("-latest.json") || name === "index.json") {
    return true;
  }

  return PUBLISHABLE_BUNDLE_EXTENSIONS.some((extension) => name.endsWith(extension));
}

function copyAssets(files, outputDir) {
  const copied = [];
  const seen = new Map();

  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  for (const filePath of files) {
    if (!shouldPublishAsset(filePath)) {
      continue;
    }

    const assetName = path.basename(filePath);
    const previous = seen.get(assetName);
    if (previous) {
      throw new Error(`GitHub Release asset 文件名冲突: ${assetName} (${previous}, ${filePath})`);
    }

    const outputPath = path.join(outputDir, assetName);
    copyFileSync(filePath, outputPath);
    seen.set(assetName, filePath);
    copied.push({
      name: assetName,
      sourcePath: filePath,
      size: statSync(filePath).size,
    });
  }

  copied.sort((left, right) => left.name.localeCompare(right.name));
  return copied;
}

function main() {
  const downloadDir = normalizeString(
    process.env.CLIENT_RELEASE_DOWNLOAD_DIR,
    "artifacts/downloaded",
  );
  const outputDir = normalizeString(
    process.env.CLIENT_GITHUB_RELEASE_ASSET_DIR,
    "artifacts/client-release/github-release-assets",
  );
  const files = walkFiles(downloadDir);
  const copied = copyAssets(files, outputDir);

  if (copied.length === 0) {
    throw new Error(`未找到可发布的 GitHub Release 客户端资产: ${downloadDir}`);
  }

  writeFileSync(
    path.join(outputDir, "asset-files.json"),
    `${JSON.stringify(
      {
        schemaVersion: "rtnn.client-github-release-assets.v1",
        assets: copied,
      },
      null,
      2,
    )}\n`,
  );

  console.log(`[client-github-release-assets] ${copied.length} files -> ${outputDir}`);
}

main();
