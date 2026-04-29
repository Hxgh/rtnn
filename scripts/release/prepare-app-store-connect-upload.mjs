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

function resolveBundleId(clientDir) {
  const explicit = normalizeString(process.env.IOS_BUNDLE_ID);
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

function resolveIpaFile(outputDir) {
  const explicit = normalizeString(process.env.IOS_IPA_FILE);
  if (explicit) {
    return explicit;
  }

  return walkFiles(outputDir)
    .filter((filePath) => filePath.endsWith(".ipa"))
    .sort((left, right) => left.localeCompare(right))[0] ?? "";
}

function resolveApiKeyPath(keyId) {
  const explicit = normalizeString(process.env.APP_STORE_CONNECT_API_KEY_PATH);
  if (explicit) {
    return explicit;
  }

  return path.join(process.cwd(), "private_keys", `AuthKey_${keyId}.p8`);
}

function main() {
  const target = requireEnv("CLIENT_TARGET");
  if (target !== "ios") {
    throw new Error(`App Store Connect upload 仅支持 ios 目标，当前目标: ${target}`);
  }

  const clientDir = requireEnv("CLIENT_DIR");
  const artifactName = requireEnv("CLIENT_ARTIFACT_NAME");
  const outputRoot = normalizeString(
    process.env.CLIENT_RELEASE_MANIFEST_DIR,
    "artifacts/client-release",
  );
  const outputDir = normalizeString(
    process.env.CLIENT_ARTIFACT_OUTPUT_DIR,
    path.join(outputRoot, artifactName, "mobile"),
  );
  const keyId = normalizeString(process.env.APP_STORE_CONNECT_KEY_ID);
  const issuerId = normalizeString(process.env.APP_STORE_CONNECT_ISSUER_ID);
  const apiKey = normalizeString(process.env.APP_STORE_CONNECT_API_KEY_BASE64);
  const apiKeyPath = keyId ? resolveApiKeyPath(keyId) : "";
  const bundleId = resolveBundleId(clientDir);
  const ipaFile = resolveIpaFile(outputDir);
  const distribution = normalizeString(process.env.IOS_DISTRIBUTION, "testflight");
  const blockers = [];

  if (!keyId) {
    blockers.push("missing-app-store-connect-key-id");
  }

  if (!issuerId) {
    blockers.push("missing-app-store-connect-issuer-id");
  }

  if (!apiKey) {
    blockers.push("missing-app-store-connect-api-key");
  }

  if (!bundleId) {
    blockers.push("missing-ios-bundle-id");
  }

  if (!ipaFile) {
    blockers.push("missing-ios-ipa-artifact");
  }

  const configured = blockers.length === 0;

  if (configured) {
    mkdirSync(path.dirname(apiKeyPath), { recursive: true });
    writeFileSync(apiKeyPath, Buffer.from(apiKey, "base64"));
  }

  const report = {
    schemaVersion: "rtnn.app-store-connect-upload-boundary.v1",
    client: requireEnv("CLIENT_NAME"),
    target,
    shell: requireEnv("CLIENT_SHELL"),
    releaseVersion: requireEnv("CLIENT_RELEASE_VERSION"),
    artifactName,
    provider: "app-store-connect",
    status: configured ? "ready-for-upload" : "blocked",
    bundleId,
    distribution,
    artifactType: "ipa",
    ipaFile: ipaFile || null,
    apiKey: {
      configured: Boolean(keyId && issuerId && apiKey),
      keyIdConfigured: Boolean(keyId),
      issuerConfigured: Boolean(issuerId),
      privateKeyConfigured: Boolean(apiKey),
      privateKeyPathWritten: configured,
      privateKeyPath: configured ? apiKeyPath : null,
      requiredSecrets: [
        "APP_STORE_CONNECT_KEY_ID",
        "APP_STORE_CONNECT_ISSUER_ID",
        "APP_STORE_CONNECT_API_KEY_BASE64",
      ],
    },
    blockers,
  };
  const reportPath = path.join(
    outputRoot,
    "app-store-connect-boundary",
    `${artifactName}.json`,
  );

  writeJson(reportPath, report);
  writeOutput("configured", configured ? "true" : "false");
  writeOutput("status", report.status);
  writeOutput("ipa_file", ipaFile);
  writeOutput("bundle_id", bundleId);
  writeOutput("distribution", distribution);
  writeOutput("api_key_id", keyId);
  writeOutput("api_issuer", issuerId);
  writeOutput("api_private_keys_dir", apiKeyPath ? path.dirname(apiKeyPath) : "");
  console.log(`[app-store-connect-upload] ${report.status} ${reportPath}`);
}

main();
