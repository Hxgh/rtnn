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

function main() {
  const artifactName = requireEnv("CLIENT_ARTIFACT_NAME");
  const outputRoot = normalizeString(
    process.env.CLIENT_RELEASE_MANIFEST_DIR,
    "artifacts/client-release",
  );
  const boundaryPath = path.join(
    outputRoot,
    "app-store-connect-boundary",
    `${artifactName}.json`,
  );

  if (!existsSync(boundaryPath)) {
    throw new Error(`缺少 App Store Connect upload boundary report: ${boundaryPath}`);
  }

  const boundary = readJson(boundaryPath);
  const attempted = normalizeBoolean(process.env.APP_STORE_CONNECT_UPLOAD_ATTEMPTED);
  const status = attempted ? "uploaded" : "skipped";
  const report = {
    schemaVersion: "rtnn.app-store-connect-release.v1",
    client: boundary.client,
    target: boundary.target,
    shell: boundary.shell,
    releaseVersion: boundary.releaseVersion,
    artifactName,
    provider: "app-store-connect",
    status,
    reason: attempted ? null : boundary.blockers[0] ?? "upload-not-attempted",
    bundleId: boundary.bundleId,
    distribution: boundary.distribution,
    artifactType: boundary.artifactType,
    ipaFileName: boundary.ipaFile ? path.basename(boundary.ipaFile) : null,
  };
  const outputPath = path.join(
    outputRoot,
    "app-store-connect",
    `${artifactName}.json`,
  );

  writeJson(outputPath, report);
  console.log(`[app-store-connect-release] ${status} ${outputPath}`);
}

main();
