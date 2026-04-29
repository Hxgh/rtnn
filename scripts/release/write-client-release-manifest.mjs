import { mkdirSync, writeFileSync } from "node:fs";
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

function main() {
  const artifactName = requireEnv("CLIENT_ARTIFACT_NAME");
  const outputDir = normalizeString(
    process.env.CLIENT_RELEASE_MANIFEST_DIR,
    "artifacts/client-release",
  );
  const outputPath = path.join(outputDir, `${artifactName}.json`);
  const generatedAt =
    normalizeString(process.env.RTNN_RELEASE_GENERATED_AT) ||
    new Date().toISOString();

  const manifest = {
    schemaVersion: "rtnn.client-release.v1",
    client: requireEnv("CLIENT_NAME"),
    target: requireEnv("CLIENT_TARGET"),
    shell: requireEnv("CLIENT_SHELL"),
    packageName: requireEnv("CLIENT_PACKAGE"),
    releaseVersion: requireEnv("CLIENT_RELEASE_VERSION"),
    shellVersion: requireEnv("CLIENT_SHELL_VERSION"),
    channel: requireEnv("CLIENT_CHANNEL"),
    releaseKind: requireEnv("CLIENT_RELEASE_KIND"),
    dryRun: normalizeString(process.env.CLIENT_RELEASE_DRY_RUN).toLowerCase() === "true",
    webUrl: requireEnv("CLIENT_WEB_URL"),
    sourceSha: requireEnv("CLIENT_SOURCE_SHA"),
    sourceRef: requireEnv("CLIENT_SOURCE_REF"),
    artifactName,
    generatedAt,
  };

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`[client-release-manifest] ${outputPath}`);
}

main();
