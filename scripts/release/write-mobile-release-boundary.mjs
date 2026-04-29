import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

function normalizeString(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function normalizeBoolean(value) {
  return ["1", "true", "yes"].includes(
    normalizeString(value).toLowerCase(),
  );
}

function requireEnv(name) {
  const value = normalizeString(process.env[name]);
  if (!value) {
    throw new Error(`缺少环境变量: ${name}`);
  }

  return value;
}

function readConfiguredFlag(name) {
  return normalizeBoolean(process.env[name]);
}

function buildMobileBuildState(policy) {
  const implemented = readConfiguredFlag("MOBILE_BUILD_IMPLEMENTED");
  const artifactDir = normalizeString(process.env.MOBILE_BUILD_ARTIFACT_DIR);

  return {
    implemented,
    status: implemented
      ? "built"
      : policy.signing.configured
        ? "ready"
        : "blocked",
    artifactDir: implemented && artifactDir ? artifactDir : undefined,
    reason: implemented
      ? undefined
      : "mobile-native-build-requires-platform-signing-and-store-policy",
    blockers: policy.signing.configured ? [] : policy.signing.requiredSecrets,
  };
}

function buildAndroidPolicy() {
  const signingConfigured = readConfiguredFlag("ANDROID_SIGNING_CONFIGURED");
  const playConfigured = readConfiguredFlag("ANDROID_PLAY_CONFIGURED");
  const artifactType = normalizeString(
    process.env.ANDROID_ARTIFACT_TYPE,
    "aab",
  );
  const storeTrack = normalizeString(process.env.ANDROID_PLAY_TRACK, "internal");
  const blockers = [];

  if (!["apk", "aab"].includes(artifactType)) {
    blockers.push("unsupported-android-artifact-type");
  }

  if (!signingConfigured) {
    blockers.push("missing-android-signing-config");
  }

  if (!playConfigured) {
    blockers.push("missing-google-play-config");
  }

  return {
    platform: "android",
    artifactType,
    signing: {
      configured: signingConfigured,
      requiredSecrets: [
        "ANDROID_KEYSTORE_BASE64",
        "ANDROID_KEYSTORE_PASSWORD",
        "ANDROID_KEY_ALIAS",
        "ANDROID_KEY_PASSWORD",
      ],
    },
    store: {
      provider: "google-play",
      configured: playConfigured,
      track: storeTrack,
      requiredSecrets: ["ANDROID_PLAY_SERVICE_ACCOUNT_JSON"],
    },
    blockers,
  };
}

function buildIosPolicy() {
  const signingConfigured = readConfiguredFlag("IOS_SIGNING_CONFIGURED");
  const appStoreConfigured = readConfiguredFlag("APP_STORE_CONNECT_CONFIGURED");
  const artifactType = normalizeString(process.env.IOS_ARTIFACT_TYPE, "ipa");
  const distribution = normalizeString(
    process.env.IOS_DISTRIBUTION,
    "testflight",
  );
  const blockers = [];

  if (artifactType !== "ipa") {
    blockers.push("unsupported-ios-artifact-type");
  }

  if (!signingConfigured) {
    blockers.push("missing-ios-signing-config");
  }

  if (!appStoreConfigured) {
    blockers.push("missing-app-store-connect-config");
  }

  return {
    platform: "ios",
    artifactType,
    signing: {
      configured: signingConfigured,
      requiredSecrets: [
        "IOS_CERTIFICATE_P12_BASE64",
        "IOS_CERTIFICATE_PASSWORD",
        "IOS_PROVISIONING_PROFILE_BASE64",
        "IOS_KEYCHAIN_PASSWORD",
      ],
    },
    store: {
      provider: "app-store-connect",
      configured: appStoreConfigured,
      distribution,
      requiredSecrets: [
        "APP_STORE_CONNECT_KEY_ID",
        "APP_STORE_CONNECT_ISSUER_ID",
        "APP_STORE_CONNECT_API_KEY_BASE64",
      ],
    },
    blockers,
  };
}

function buildPolicy(target) {
  if (target === "android") {
    return buildAndroidPolicy();
  }

  if (target === "ios") {
    return buildIosPolicy();
  }

  throw new Error(`移动发布边界仅支持 android/ios，当前目标: ${target}`);
}

function main() {
  const artifactName = requireEnv("CLIENT_ARTIFACT_NAME");
  const target = requireEnv("CLIENT_TARGET");
  const outputDir = normalizeString(
    process.env.CLIENT_MOBILE_BOUNDARY_DIR,
    "artifacts/client-release/mobile-boundary",
  );
  const outputPath = path.join(outputDir, `${artifactName}.json`);
  const policy = buildPolicy(target);
  const generatedAt =
    normalizeString(process.env.RTNN_RELEASE_GENERATED_AT) ||
    new Date().toISOString();
  const status =
    policy.blockers.length === 0 ? "ready-for-store-build" : "blocked";

  const report = {
    schemaVersion: "rtnn.mobile-release-boundary.v1",
    client: requireEnv("CLIENT_NAME"),
    target,
    shell: requireEnv("CLIENT_SHELL"),
    packageName: requireEnv("CLIENT_PACKAGE"),
    releaseVersion: requireEnv("CLIENT_RELEASE_VERSION"),
    shellVersion: requireEnv("CLIENT_SHELL_VERSION"),
    channel: requireEnv("CLIENT_CHANNEL"),
    releaseKind: requireEnv("CLIENT_RELEASE_KIND"),
    webUrl: requireEnv("CLIENT_WEB_URL"),
    sourceSha: requireEnv("CLIENT_SOURCE_SHA"),
    sourceRef: requireEnv("CLIENT_SOURCE_REF"),
    artifactName,
    status,
    build: buildMobileBuildState(policy),
    policy,
    generatedAt,
  };

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[mobile-release-boundary] ${outputPath}`);
}

main();
