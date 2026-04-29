import {
  existsSync,
  mkdirSync,
  readFileSync,
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

function isSemver(value) {
  return /^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value);
}

function resolveUpdaterPlatform(target) {
  const explicit = normalizeString(process.env.CLIENT_UPDATER_PLATFORM);
  if (explicit) {
    return explicit;
  }

  const os = process.platform;
  const arch = process.arch;
  const osMap = {
    darwin: "darwin",
    linux: "linux",
    win32: "windows",
  };
  const archMap = {
    arm: "armv7",
    arm64: "aarch64",
    ia32: "i686",
    x64: "x86_64",
  };

  if (!osMap[os] || !archMap[arch]) {
    return "";
  }

  if (target === "macos" && osMap[os] !== "darwin") {
    return "";
  }

  if (target === "windows" && osMap[os] !== "windows") {
    return "";
  }

  return `${osMap[os]}-${archMap[arch]}`;
}

function readArtifactFiles(bundleOutputRoot) {
  const manifestPath = path.join(bundleOutputRoot, "artifact-files.json");
  if (!existsSync(manifestPath)) {
    return [];
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  return Array.isArray(manifest.files) ? manifest.files : [];
}

function findSignedAsset(bundleOutputRoot) {
  const signatureOverride = normalizeString(process.env.CLIENT_UPDATER_SIGNATURE);
  const assetNameOverride = normalizeString(process.env.CLIENT_UPDATER_ASSET_NAME);

  if (signatureOverride || assetNameOverride) {
    if (!signatureOverride || !assetNameOverride) {
      return null;
    }

    return {
      assetName: assetNameOverride,
      signature: signatureOverride,
    };
  }

  const files = readArtifactFiles(bundleOutputRoot);
  const signatureFile = files
    .map((file) => file.path)
    .filter((filePath) => filePath.endsWith(".sig"))
    .sort()[0];

  if (!signatureFile) {
    return null;
  }

  const assetPath = signatureFile.slice(0, -4);
  if (!files.some((file) => file.path === assetPath)) {
    return null;
  }

  return {
    assetName: path.basename(assetPath),
    signature: readFileSync(path.join(bundleOutputRoot, signatureFile), "utf8").trim(),
  };
}

function resolveAssetBaseUrl(releaseTag) {
  const explicit = normalizeString(process.env.CLIENT_UPDATER_ASSET_BASE_URL);
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  const repository = normalizeString(process.env.GITHUB_REPOSITORY);
  if (!repository) {
    return "";
  }

  return `https://github.com/${repository}/releases/download/${releaseTag}`;
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeSkip(outputRoot, artifactName, reason, details = {}) {
  const filePath = path.join(outputRoot, "updater-skips", `${artifactName}.json`);
  writeJson(filePath, {
    schemaVersion: "rtnn.tauri-updater-skip.v1",
    artifactName,
    reason,
    ...details,
  });
  console.log(`[tauri-updater-manifest] skip ${artifactName}: ${reason}`);

  if (normalizeString(process.env.CLIENT_UPDATER_STRICT).toLowerCase() === "true") {
    throw new Error(`无法生成 Tauri updater manifest: ${reason}`);
  }
}

function main() {
  const artifactName = requireEnv("CLIENT_ARTIFACT_NAME");
  const client = requireEnv("CLIENT_NAME");
  const target = requireEnv("CLIENT_TARGET");
  const shell = requireEnv("CLIENT_SHELL");
  const releaseVersion = requireEnv("CLIENT_RELEASE_VERSION");
  const releaseTag = normalizeString(process.env.CLIENT_RELEASE_TAG, releaseVersion);
  const outputRoot = normalizeString(
    process.env.CLIENT_RELEASE_MANIFEST_DIR,
    "artifacts/client-release",
  );
  const bundleOutputRoot = normalizeString(
    process.env.CLIENT_ARTIFACT_OUTPUT_DIR,
    path.join(outputRoot, artifactName, "bundle"),
  );
  const pubDate =
    normalizeString(process.env.CLIENT_UPDATER_PUB_DATE) ||
    new Date().toISOString();
  const notes = normalizeString(process.env.CLIENT_UPDATER_NOTES);

  if (!isSemver(releaseVersion)) {
    writeSkip(outputRoot, artifactName, "invalid-version", {
      releaseVersion,
    });
    return;
  }

  const platform = resolveUpdaterPlatform(target);
  if (!platform) {
    writeSkip(outputRoot, artifactName, "unknown-platform", {
      target,
    });
    return;
  }

  const signedAsset = findSignedAsset(bundleOutputRoot);
  if (!signedAsset) {
    writeSkip(outputRoot, artifactName, "missing-signature", {
      bundleOutputRoot,
    });
    return;
  }

  const assetBaseUrl = resolveAssetBaseUrl(releaseTag);
  if (!assetBaseUrl) {
    writeSkip(outputRoot, artifactName, "missing-asset-base-url", {
      releaseTag,
    });
    return;
  }

  const manifest = {
    schemaVersion: "rtnn.tauri-updater-fragment.v1",
    client,
    target,
    shell,
    artifactName,
    releaseTag,
    latest: {
      version: releaseVersion,
      notes,
      pub_date: pubDate,
      platforms: {
        [platform]: {
          signature: signedAsset.signature,
          url: `${assetBaseUrl}/${encodeURIComponent(signedAsset.assetName)}`,
        },
      },
    },
  };
  const outputPath = path.join(outputRoot, "updater-fragments", `${artifactName}.json`);

  writeJson(outputPath, manifest);
  console.log(`[tauri-updater-manifest] ${outputPath}`);
}

main();
