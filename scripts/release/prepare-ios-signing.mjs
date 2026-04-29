import {
  appendFileSync,
  mkdirSync,
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

function resolveApiKeyPath(keyId) {
  const explicit = normalizeString(process.env.APP_STORE_CONNECT_API_KEY_PATH);
  if (explicit) {
    return explicit;
  }

  return path.join(process.cwd(), "private_keys", `AuthKey_${keyId}.p8`);
}

function resolveTempFilePath(envName, artifactName, fileName) {
  const explicit = normalizeString(process.env[envName]);
  if (explicit) {
    return explicit;
  }

  const tempRoot = normalizeString(
    process.env.RUNNER_TEMP,
    path.join(process.cwd(), ".tmp"),
  );

  return path.join(tempRoot, artifactName, fileName);
}

function collectSigningBlockers({
  certificate,
  certificatePassword,
  provisioningProfile,
  keychainPassword,
}) {
  const blockers = [];

  if (!certificate) {
    blockers.push("missing-ios-certificate-p12-base64");
  }

  if (!certificatePassword) {
    blockers.push("missing-ios-certificate-password");
  }

  if (!provisioningProfile) {
    blockers.push("missing-ios-provisioning-profile-base64");
  }

  if (!keychainPassword) {
    blockers.push("missing-ios-keychain-password");
  }

  return blockers;
}

function collectAppStoreConnectBlockers({ keyId, issuerId, apiKey }) {
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

  return blockers;
}

function main() {
  const target = requireEnv("CLIENT_TARGET");
  if (target !== "ios") {
    throw new Error(`iOS signing 仅支持 ios 目标，当前目标: ${target}`);
  }

  const artifactName = requireEnv("CLIENT_ARTIFACT_NAME");
  const outputRoot = normalizeString(
    process.env.CLIENT_RELEASE_MANIFEST_DIR,
    "artifacts/client-release",
  );
  const certificate = normalizeString(process.env.IOS_CERTIFICATE_P12_BASE64);
  const certificatePassword = normalizeString(process.env.IOS_CERTIFICATE_PASSWORD);
  const provisioningProfile = normalizeString(
    process.env.IOS_PROVISIONING_PROFILE_BASE64,
  );
  const keychainPassword = normalizeString(process.env.IOS_KEYCHAIN_PASSWORD);
  const keyId = normalizeString(process.env.APP_STORE_CONNECT_KEY_ID);
  const issuerId = normalizeString(process.env.APP_STORE_CONNECT_ISSUER_ID);
  const apiKey = normalizeString(process.env.APP_STORE_CONNECT_API_KEY_BASE64);
  const signingBlockers = collectSigningBlockers({
    certificate,
    certificatePassword,
    provisioningProfile,
    keychainPassword,
  });
  const appStoreConnectBlockers = collectAppStoreConnectBlockers({
    keyId,
    issuerId,
    apiKey,
  });
  const signingConfigured = signingBlockers.length === 0;
  const appStoreConnectConfigured = appStoreConnectBlockers.length === 0;
  const apiKeyPath = keyId ? resolveApiKeyPath(keyId) : "";
  const certificatePath = resolveTempFilePath(
    "IOS_CERTIFICATE_PATH",
    artifactName,
    "ios-distribution.p12",
  );
  const provisioningProfilePath = resolveTempFilePath(
    "IOS_PROVISIONING_PROFILE_PATH",
    artifactName,
    "ios-distribution.mobileprovision",
  );
  const keychainPath = resolveTempFilePath(
    "IOS_KEYCHAIN_PATH",
    artifactName,
    "ios-signing.keychain-db",
  );

  if (signingConfigured) {
    mkdirSync(path.dirname(certificatePath), { recursive: true });
    writeFileSync(certificatePath, Buffer.from(certificate, "base64"));
    mkdirSync(path.dirname(provisioningProfilePath), { recursive: true });
    writeFileSync(
      provisioningProfilePath,
      Buffer.from(provisioningProfile, "base64"),
    );
  }

  if (appStoreConnectConfigured) {
    mkdirSync(path.dirname(apiKeyPath), { recursive: true });
    writeFileSync(apiKeyPath, Buffer.from(apiKey, "base64"));
  }

  const report = {
    schemaVersion: "rtnn.ios-signing-boundary.v1",
    client: requireEnv("CLIENT_NAME"),
    target,
    shell: requireEnv("CLIENT_SHELL"),
    releaseVersion: requireEnv("CLIENT_RELEASE_VERSION"),
    artifactName,
    artifactType: "ipa",
    status: signingConfigured ? "ready-for-ios-build" : "blocked",
    signing: {
      configured: signingConfigured,
      requiredSecrets: [
        "IOS_CERTIFICATE_P12_BASE64",
        "IOS_CERTIFICATE_PASSWORD",
        "IOS_PROVISIONING_PROFILE_BASE64",
        "IOS_KEYCHAIN_PASSWORD",
      ],
      certificateFileWritten: signingConfigured,
      provisioningProfileFileWritten: signingConfigured,
      keychainPath: signingConfigured ? keychainPath : null,
    },
    appStoreConnect: {
      configured: appStoreConnectConfigured,
      requiredSecrets: [
        "APP_STORE_CONNECT_KEY_ID",
        "APP_STORE_CONNECT_ISSUER_ID",
        "APP_STORE_CONNECT_API_KEY_BASE64",
      ],
      apiKeyPathWritten: appStoreConnectConfigured,
      apiKeyPath: appStoreConnectConfigured ? apiKeyPath : null,
    },
    blockers: signingBlockers,
    uploadBlockers: appStoreConnectBlockers,
  };
  const reportPath = path.join(outputRoot, "ios-signing", `${artifactName}.json`);

  writeJson(reportPath, report);
  writeOutput("configured", signingConfigured ? "true" : "false");
  writeOutput("status", report.status);
  writeOutput("release_kind", signingConfigured ? "ios-signed-ipa" : "mobile-manifest-only");
  writeOutput("app_store_connect_configured", appStoreConnectConfigured ? "true" : "false");
  writeOutput("certificate_path", signingConfigured ? certificatePath : "");
  writeOutput(
    "provisioning_profile_path",
    signingConfigured ? provisioningProfilePath : "",
  );
  writeOutput("keychain_path", signingConfigured ? keychainPath : "");
  writeOutput("apple_api_key_path", apiKeyPath);
  writeOutput("apple_api_key_id", keyId);
  writeOutput("apple_api_issuer", issuerId);
  console.log(`[ios-signing] ${report.status} ${reportPath}`);
}

main();
