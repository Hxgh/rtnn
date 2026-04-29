import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  PROJECT_METADATA_FILE,
  readProjectMetadata,
} from "../lib/project-metadata.mjs";
import { buildProjectProfile } from "../lib/project-profile.mjs";

const CLIENT_SPECS = Object.freeze({
  adminDesktop: Object.freeze({
    packageName: "@rtnn/admin-tauri",
    clientDir: "clients/admin-tauri",
    shell: "admin-desktop",
    domainKey: "admin",
    defaultWebUrl: "https://admin.example.com",
  }),
  appMobile: Object.freeze({
    packageName: "@rtnn/app-tauri",
    clientDir: "clients/app-tauri",
    shell: "app-mobile",
    domainKey: "app",
    defaultWebUrl: "https://app.example.com",
  }),
});

const TARGET_RUNNERS = Object.freeze({
  macos: "macos-latest",
  windows: "windows-latest",
  android: "ubuntu-latest",
  ios: "macos-latest",
});

function normalizeString(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function sanitizeVersion(value) {
  return normalizeString(value, "dev")
    .replace(/[^0-9A-Za-z._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "dev";
}

function writeOutput(key, value) {
  const serialized = String(value ?? "");
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${serialized}\n`);
    return;
  }

  console.log(`${key}=${serialized}`);
}

function writeDisabled(reason) {
  writeOutput("enabled", "false");
  writeOutput("reason", reason);
  writeOutput("dry_run", resolveDryRun() ? "true" : "false");
  writeOutput(
    "publish_github_release",
    resolvePublishGithubRelease() ? "true" : "false",
  );
  writeOutput(
    "sync_deploy_facts",
    resolveSyncDeployFacts() ? "true" : "false",
  );
  writeOutput(
    "release_channel",
    normalizeString(process.env.CLIENT_RELEASE_CHANNEL, "testing"),
  );
  writeOutput("release_tag", resolveReleaseTag(resolveReleaseVersion()));
  writeOutput("client_matrix", JSON.stringify({ include: [] }));
  writeOutput("enabled_clients_json", JSON.stringify([]));
}

function resolveSourceRef() {
  return normalizeString(process.env.GITHUB_REF, "local");
}

function resolveSourceSha() {
  return normalizeString(process.env.GITHUB_SHA, "local");
}

function resolveReleaseVersion() {
  const explicit = normalizeString(process.env.CLIENT_RELEASE_VERSION);
  if (explicit) {
    return sanitizeVersion(explicit);
  }

  const githubRef = normalizeString(process.env.GITHUB_REF);
  const githubRefName = normalizeString(process.env.GITHUB_REF_NAME);
  const sourceSha = resolveSourceSha();
  const shortSha = sourceSha === "local" ? "local" : sourceSha.slice(0, 12);

  if (githubRef.startsWith("refs/tags/") && githubRefName) {
    return sanitizeVersion(githubRefName);
  }

  return sanitizeVersion(`${githubRefName || "local"}-${shortSha}`);
}

function resolveReleaseTag(releaseVersion) {
  const explicit = normalizeString(process.env.CLIENT_RELEASE_TAG);
  if (explicit) {
    return explicit;
  }

  const githubRef = normalizeString(process.env.GITHUB_REF);
  const githubRefName = normalizeString(process.env.GITHUB_REF_NAME);
  if (githubRef.startsWith("refs/tags/") && githubRefName) {
    return githubRefName;
  }

  return releaseVersion;
}

function resolveDryRun() {
  const value = normalizeString(process.env.CLIENT_RELEASE_DRY_RUN).toLowerCase();
  if (["1", "true", "yes"].includes(value)) {
    return true;
  }

  if (["0", "false", "no"].includes(value)) {
    return false;
  }

  return false;
}

function resolvePublishGithubRelease() {
  const value = normalizeString(
    process.env.CLIENT_RELEASE_PUBLISH_GITHUB_RELEASE,
  ).toLowerCase();
  if (["1", "true", "yes"].includes(value)) {
    return true;
  }

  if (["0", "false", "no"].includes(value)) {
    return false;
  }

  return resolveSourceRef().startsWith("refs/tags/");
}

function resolveSyncDeployFacts() {
  const value = normalizeString(
    process.env.CLIENT_RELEASE_SYNC_DEPLOY_FACTS,
  ).toLowerCase();
  if (["1", "true", "yes"].includes(value)) {
    return true;
  }

  if (["0", "false", "no"].includes(value)) {
    return false;
  }

  return false;
}

function readShellVersion(rootDir, clientDir) {
  const configPath = path.join(rootDir, clientDir, "src-tauri", "tauri.conf.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  return normalizeString(config.version, "0.0.0");
}

function normalizeWebUrl(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return "";
  }

  if (/^https?:\/\//.test(normalized)) {
    return normalized;
  }

  return `https://${normalized}`;
}

function resolveClientWebUrl(metadata, clientProfile, spec, channel) {
  const channelUrl = normalizeWebUrl(clientProfile.webUrls?.[channel]);
  if (channelUrl) {
    return channelUrl;
  }

  const explicitUrl = normalizeWebUrl(clientProfile.webUrl);
  if (explicitUrl) {
    return explicitUrl;
  }

  const domainUrl = normalizeWebUrl(metadata.domains?.[channel]?.[spec.domainKey]);
  if (domainUrl) {
    return domainUrl;
  }

  return spec.defaultWebUrl;
}

function main() {
  const rootDir = process.cwd();
  const metadata = readProjectMetadata(rootDir);

  if (!metadata) {
    writeDisabled("missing-project-metadata");
    return;
  }

  const projectRole = normalizeString(metadata.project?.role);
  if (projectRole !== "business-source") {
    writeDisabled("repo-role-disabled");
    return;
  }

  const profile = buildProjectProfile(metadata);
  const releaseVersion = resolveReleaseVersion();
  const releaseTag = resolveReleaseTag(releaseVersion);
  const sourceSha = resolveSourceSha();
  const sourceRef = resolveSourceRef();
  const dryRun = resolveDryRun();
  const publishGithubRelease = resolvePublishGithubRelease();
  const syncDeployFacts = resolveSyncDeployFacts();
  const channelOverride = normalizeString(process.env.CLIENT_RELEASE_CHANNEL);
  const matrix = [];

  for (const { client, target } of profile.enabledClientBuildTargets) {
    const spec = CLIENT_SPECS[client];
    if (!spec) {
      throw new Error(`未知客户端发布目标: ${client}`);
    }

    const targetRunner = TARGET_RUNNERS[target];
    if (!targetRunner) {
      throw new Error(`未知客户端平台目标: ${client}/${target}`);
    }

    const clientProfile = profile.clients[client];
    const channel = channelOverride || clientProfile.channel || "production";
    const webUrl = resolveClientWebUrl(metadata, clientProfile, spec, channel);
    const artifactName = `${spec.shell}-${target}-${releaseVersion}`;
    const desktopBuild = ["macos", "windows"].includes(target);

    matrix.push({
      client,
      target,
      runner: targetRunner,
      package: spec.packageName,
      client_dir: spec.clientDir,
      shell: spec.shell,
      web_url: webUrl,
      channel,
      release_version: releaseVersion,
      shell_version: readShellVersion(rootDir, spec.clientDir),
      artifact_name: artifactName,
      release_kind: desktopBuild ? "desktop-unsigned" : "mobile-manifest-only",
      desktop_build: desktopBuild,
    });
  }

  if (matrix.length === 0) {
    writeDisabled("no-enabled-clients");
    return;
  }

  const releaseChannels = [...new Set(matrix.map((item) => item.channel))].sort();
  if (syncDeployFacts && releaseChannels.length !== 1) {
    throw new Error(`客户端发布矩阵 channel 不一致: ${releaseChannels.join(", ")}`);
  }

  for (const warning of profile.warnings) {
    console.warn(`[client-release-context] ${warning}`);
  }

  writeOutput("enabled", "true");
  writeOutput("reason", "business-source");
  writeOutput("dry_run", dryRun ? "true" : "false");
  writeOutput("publish_github_release", publishGithubRelease ? "true" : "false");
  writeOutput("sync_deploy_facts", syncDeployFacts ? "true" : "false");
  writeOutput("release_channel", releaseChannels[0] ?? channelOverride);
  writeOutput("release_version", releaseVersion);
  writeOutput("release_tag", releaseTag);
  writeOutput("source_sha", sourceSha);
  writeOutput("source_ref", sourceRef);
  writeOutput("client_matrix", JSON.stringify({ include: matrix }));
  writeOutput(
    "enabled_clients_json",
    JSON.stringify([...new Set(matrix.map((item) => item.client))]),
  );
  writeOutput("project_metadata_file", PROJECT_METADATA_FILE);
}

main();
