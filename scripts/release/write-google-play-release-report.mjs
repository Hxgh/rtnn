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

function normalizeBoolean(value) {
  return ["1", "true", "yes"].includes(
    normalizeString(value).toLowerCase(),
  );
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function parseJsonArray(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(normalized);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function main() {
  const artifactName = requireEnv("CLIENT_ARTIFACT_NAME");
  const outputRoot = normalizeString(
    process.env.CLIENT_RELEASE_MANIFEST_DIR,
    "artifacts/client-release",
  );
  const boundaryPath = path.join(
    outputRoot,
    "google-play-boundary",
    `${artifactName}.json`,
  );

  if (!existsSync(boundaryPath)) {
    throw new Error(`缺少 Google Play upload boundary report: ${boundaryPath}`);
  }

  const boundary = readJson(boundaryPath);
  const attempted = normalizeBoolean(process.env.GOOGLE_PLAY_UPLOAD_ATTEMPTED);
  const committedEditId = normalizeString(process.env.GOOGLE_PLAY_COMMITTED_EDIT_ID);
  const internalSharingDownloadUrls = normalizeString(
    process.env.GOOGLE_PLAY_INTERNAL_SHARING_DOWNLOAD_URLS,
  );
  const status = attempted ? "uploaded" : "skipped";
  const report = {
    schemaVersion: "rtnn.google-play-release.v1",
    client: boundary.client,
    target: boundary.target,
    shell: boundary.shell,
    releaseVersion: boundary.releaseVersion,
    artifactName,
    provider: "google-play",
    status,
    reason: attempted ? null : boundary.blockers[0] ?? "upload-not-attempted",
    packageName: boundary.packageName,
    track: boundary.track,
    releaseStatus: boundary.releaseStatus,
    artifactType: boundary.artifactType,
    releaseFileName: boundary.releaseFile ? path.basename(boundary.releaseFile) : null,
    committedEditId: committedEditId || null,
    internalSharingDownloadUrls: parseJsonArray(internalSharingDownloadUrls),
  };
  const outputPath = path.join(outputRoot, "google-play", `${artifactName}.json`);

  writeJson(outputPath, report);
  console.log(`[google-play-release] ${status} ${outputPath}`);
}

main();
