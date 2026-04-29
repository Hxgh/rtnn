import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
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

function normalizeArtifactType(value) {
  const artifactType = normalizeString(value, "aab");
  if (!["aab", "apk"].includes(artifactType)) {
    return "aab";
  }

  return artifactType;
}

function normalizeReleaseStatus(value) {
  const status = normalizeString(value, "draft");
  if (!["completed", "inProgress", "halted", "draft"].includes(status)) {
    return "draft";
  }

  return status;
}

function writeOutput(key, value) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${String(value ?? "")}\n`);
  }
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
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

function resolvePackageName(clientDir) {
  const explicit = normalizeString(process.env.ANDROID_PACKAGE_NAME);
  if (explicit) {
    return explicit;
  }

  const tauriConfigPath = path.join(clientDir, "src-tauri", "tauri.conf.json");
  if (!existsSync(tauriConfigPath)) {
    return "";
  }

  const tauriConfig = readJson(tauriConfigPath);
  return normalizeString(tauriConfig.identifier);
}

function resolveReleaseFile(outputDir, artifactType) {
  const explicit = normalizeString(process.env.ANDROID_RELEASE_FILE);
  if (explicit) {
    return explicit;
  }

  const extension = `.${artifactType}`;
  return walkFiles(outputDir)
    .filter((filePath) => filePath.endsWith(extension))
    .sort((left, right) => {
      const leftRelease = left.includes(`${path.sep}release${path.sep}`) ? 0 : 1;
      const rightRelease = right.includes(`${path.sep}release${path.sep}`) ? 0 : 1;
      if (leftRelease !== rightRelease) {
        return leftRelease - rightRelease;
      }

      return left.localeCompare(right);
    })[0] ?? "";
}

function main() {
  const target = requireEnv("CLIENT_TARGET");
  if (target !== "android") {
    throw new Error(`Google Play upload 仅支持 android 目标，当前目标: ${target}`);
  }

  const clientDir = requireEnv("CLIENT_DIR");
  const artifactName = requireEnv("CLIENT_ARTIFACT_NAME");
  const releaseVersion = requireEnv("CLIENT_RELEASE_VERSION");
  const outputRoot = normalizeString(
    process.env.CLIENT_RELEASE_MANIFEST_DIR,
    "artifacts/client-release",
  );
  const outputDir = normalizeString(
    process.env.CLIENT_ARTIFACT_OUTPUT_DIR,
    path.join(outputRoot, artifactName, "mobile"),
  );
  const artifactType = normalizeArtifactType(process.env.ANDROID_ARTIFACT_TYPE);
  const track = normalizeString(process.env.ANDROID_PLAY_TRACK, "internal");
  const releaseStatus = normalizeReleaseStatus(process.env.ANDROID_PLAY_STATUS);
  const serviceAccountConfigured = Boolean(
    normalizeString(process.env.ANDROID_PLAY_SERVICE_ACCOUNT_JSON),
  );
  const packageName = resolvePackageName(clientDir);
  const releaseFile = resolveReleaseFile(outputDir, artifactType);
  const blockers = [];

  if (!serviceAccountConfigured) {
    blockers.push("missing-google-play-service-account");
  }

  if (!packageName) {
    blockers.push("missing-android-package-name");
  }

  if (!releaseFile) {
    blockers.push(`missing-android-${artifactType}-artifact`);
  }

  const configured = blockers.length === 0;
  const report = {
    schemaVersion: "rtnn.google-play-upload-boundary.v1",
    client: requireEnv("CLIENT_NAME"),
    target,
    shell: requireEnv("CLIENT_SHELL"),
    releaseVersion,
    artifactName,
    provider: "google-play",
    status: configured ? "ready-for-upload" : "blocked",
    packageName,
    track,
    releaseStatus,
    artifactType,
    releaseFile: releaseFile || null,
    serviceAccount: {
      configured: serviceAccountConfigured,
      requiredSecrets: ["ANDROID_PLAY_SERVICE_ACCOUNT_JSON"],
    },
    blockers,
  };
  const reportPath = path.join(
    outputRoot,
    "google-play-boundary",
    `${artifactName}.json`,
  );

  writeJson(reportPath, report);
  writeOutput("configured", configured ? "true" : "false");
  writeOutput("status", report.status);
  writeOutput("release_file", releaseFile);
  writeOutput("package_name", packageName);
  writeOutput("track", track);
  writeOutput("release_status", releaseStatus);
  console.log(`[google-play-upload] ${report.status} ${reportPath}`);
}

main();
