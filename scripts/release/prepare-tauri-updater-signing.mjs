import {
  appendFileSync,
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

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeOutput(key, value) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${String(value)}\n`);
  }
}

function resolveUpdaterEndpoint(shell) {
  const explicit =
    normalizeString(process.env.TAURI_UPDATER_ENDPOINT) ||
    normalizeString(process.env.CLIENT_UPDATER_ENDPOINT);
  if (explicit) {
    return explicit;
  }

  const repository = normalizeString(process.env.GITHUB_REPOSITORY);
  if (!repository) {
    return "";
  }

  return `https://github.com/${repository}/releases/latest/download/${shell}-latest.json`;
}

function buildReport({
  artifactName,
  client,
  target,
  shell,
  releaseVersion,
  channel,
  publicKey,
  privateKey,
  endpoint,
  configPath,
  configured,
  blockers,
}) {
  return {
    schemaVersion: "rtnn.desktop-signing-boundary.v1",
    client,
    target,
    shell,
    releaseVersion,
    channel,
    artifactName,
    status: configured ? "ready-for-signed-build" : "blocked",
    signing: {
      configured: Boolean(privateKey),
      requiredSecrets: ["TAURI_SIGNING_PRIVATE_KEY"],
      optionalSecrets: ["TAURI_SIGNING_PRIVATE_KEY_PASSWORD"],
    },
    updater: {
      configured: Boolean(publicKey && endpoint),
      publicKeyConfigured: Boolean(publicKey),
      endpointConfigured: Boolean(endpoint),
      endpoint,
      createUpdaterArtifacts: configured,
      requiredSecretsOrVars: ["TAURI_UPDATER_PUBLIC_KEY"],
      optionalVars: ["TAURI_UPDATER_ENDPOINT"],
    },
    config: {
      path: configPath,
      patched: configured,
    },
    blockers,
  };
}

function patchTauriConfig(configPath, publicKey, endpoint) {
  const config = readJson(configPath);
  config.bundle = config.bundle ?? {};
  config.bundle.createUpdaterArtifacts = true;
  config.plugins = config.plugins ?? {};
  config.plugins.updater = {
    ...(config.plugins.updater ?? {}),
    pubkey: publicKey,
    endpoints: [endpoint],
  };

  writeJson(configPath, config);
}

function main() {
  const clientDir = requireEnv("CLIENT_DIR");
  const artifactName = requireEnv("CLIENT_ARTIFACT_NAME");
  const target = requireEnv("CLIENT_TARGET");
  const shell = requireEnv("CLIENT_SHELL");
  const client = requireEnv("CLIENT_NAME");
  const releaseVersion = requireEnv("CLIENT_RELEASE_VERSION");
  const channel = requireEnv("CLIENT_CHANNEL");
  const outputRoot = normalizeString(
    process.env.CLIENT_RELEASE_MANIFEST_DIR,
    "artifacts/client-release",
  );
  const configPath = normalizeString(
    process.env.TAURI_CONFIG_PATH,
    path.join(clientDir, "src-tauri", "tauri.conf.json"),
  );
  const publicKey = normalizeString(process.env.TAURI_UPDATER_PUBLIC_KEY);
  const privateKey = normalizeString(process.env.TAURI_SIGNING_PRIVATE_KEY);
  const endpoint = resolveUpdaterEndpoint(shell);
  const blockers = [];

  if (!["macos", "windows"].includes(target)) {
    throw new Error(`Tauri updater signing 仅支持 desktop 目标，当前目标: ${target}`);
  }

  if (!publicKey) {
    blockers.push("missing-tauri-updater-public-key");
  }

  if (!endpoint) {
    blockers.push("missing-tauri-updater-endpoint");
  }

  if (!privateKey) {
    blockers.push("missing-tauri-signing-private-key");
  }

  const configured = blockers.length === 0;

  if (configured) {
    patchTauriConfig(configPath, publicKey, endpoint);
  }

  const report = buildReport({
    artifactName,
    client,
    target,
    shell,
    releaseVersion,
    channel,
    publicKey,
    privateKey,
    endpoint,
    configPath,
    configured,
    blockers,
  });
  const outputPath = path.join(
    outputRoot,
    "desktop-signing",
    `${artifactName}.json`,
  );

  writeJson(outputPath, report);
  writeOutput("configured", configured ? "true" : "false");
  writeOutput("status", report.status);
  console.log(
    `[tauri-updater-signing] ${configured ? "configured" : "blocked"} ${outputPath}`,
  );
}

main();
