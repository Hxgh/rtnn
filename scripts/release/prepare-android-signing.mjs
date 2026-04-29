import {
  appendFileSync,
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

function normalizeArtifactType(value) {
  const artifactType = normalizeString(value, "aab");
  if (!["aab", "apk"].includes(artifactType)) {
    return "aab";
  }

  return artifactType;
}

function writeOutput(key, value) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${String(value)}\n`);
  }
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function buildSigningConfigBlock() {
  return `    signingConfigs {
        create("release") {
            val keystorePropertiesFile = rootProject.file("keystore.properties")
            val keystoreProperties = Properties()

            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(FileInputStream(keystorePropertiesFile))
            }

            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = (keystoreProperties["keyPassword"] ?: keystoreProperties["password"]) as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["password"] as String
        }
    }

`;
}

function addImport(source, importLine) {
  if (source.includes(importLine)) {
    return source;
  }

  const firstImportIndex = source.search(/^import\s/m);
  if (firstImportIndex >= 0) {
    return `${source.slice(0, firstImportIndex)}${importLine}\n${source.slice(firstImportIndex)}`;
  }

  return `${importLine}\n${source}`;
}

function patchReleaseSigningConfig(source) {
  if (source.includes("signingConfigs.getByName(\"release\")")) {
    return source;
  }

  const releaseBlockPattern = /getByName\("release"\)\s*\{/;
  const releaseMatch = source.match(releaseBlockPattern);

  if (releaseMatch?.index !== undefined) {
    const insertAt = releaseMatch.index + releaseMatch[0].length;
    return `${source.slice(0, insertAt)}
            signingConfig = signingConfigs.getByName("release")${source.slice(insertAt)}`;
  }

  const namedReleasePattern = /release\s*\{/;
  const namedReleaseMatch = source.match(namedReleasePattern);

  if (namedReleaseMatch?.index !== undefined) {
    const insertAt = namedReleaseMatch.index + namedReleaseMatch[0].length;
    return `${source.slice(0, insertAt)}
            signingConfig = signingConfigs.getByName("release")${source.slice(insertAt)}`;
  }

  throw new Error("Android build.gradle.kts 缺少 release build type");
}

function patchGradleFile(buildGradlePath) {
  let source = readFileSync(buildGradlePath, "utf8");
  source = addImport(source, "import java.io.FileInputStream");
  source = addImport(source, "import java.util.Properties");

  if (!source.includes("create(\"release\")")) {
    const buildTypesIndex = source.indexOf("    buildTypes {");
    if (buildTypesIndex === -1) {
      throw new Error("Android build.gradle.kts 缺少 buildTypes 块");
    }

    source = `${source.slice(0, buildTypesIndex)}${buildSigningConfigBlock()}${source.slice(buildTypesIndex)}`;
  }

  source = patchReleaseSigningConfig(source);
  writeFileSync(buildGradlePath, source);
}

function collectBlockers({ keystoreBase64, keystorePassword, keyAlias, keyPassword, androidDir }) {
  const blockers = [];

  if (!keystoreBase64) {
    blockers.push("missing-android-keystore-base64");
  }

  if (!keystorePassword) {
    blockers.push("missing-android-keystore-password");
  }

  if (!keyAlias) {
    blockers.push("missing-android-key-alias");
  }

  if (!keyPassword) {
    blockers.push("missing-android-key-password");
  }

  if (blockers.length === 0 && !existsSync(androidDir)) {
    blockers.push("missing-tauri-android-project");
  }

  return blockers;
}

function writeReport({
  artifactName,
  releaseVersion,
  artifactType,
  androidDir,
  keystorePath,
  configured,
  blockers,
}) {
  const outputRoot = normalizeString(
    process.env.CLIENT_RELEASE_MANIFEST_DIR,
    "artifacts/client-release",
  );
  const outputPath = path.join(
    outputRoot,
    "android-signing",
    `${artifactName}.json`,
  );

  writeJson(outputPath, {
    schemaVersion: "rtnn.android-signing-boundary.v1",
    client: requireEnv("CLIENT_NAME"),
    target: requireEnv("CLIENT_TARGET"),
    shell: requireEnv("CLIENT_SHELL"),
    releaseVersion,
    artifactName,
    artifactType,
    status: configured ? "ready-for-android-build" : "blocked",
    signing: {
      configured,
      requiredSecrets: [
        "ANDROID_KEYSTORE_BASE64",
        "ANDROID_KEYSTORE_PASSWORD",
        "ANDROID_KEY_ALIAS",
        "ANDROID_KEY_PASSWORD",
      ],
    },
    generatedProject: {
      androidDir,
      exists: existsSync(androidDir),
    },
    keystore: {
      written: configured,
      path: configured ? keystorePath : null,
    },
    blockers,
  });

  console.log(
    `[android-signing] ${configured ? "configured" : "blocked"} ${outputPath}`,
  );
}

function main() {
  const target = requireEnv("CLIENT_TARGET");
  if (target !== "android") {
    throw new Error(`Android signing 仅支持 android 目标，当前目标: ${target}`);
  }

  const clientDir = requireEnv("CLIENT_DIR");
  const artifactName = requireEnv("CLIENT_ARTIFACT_NAME");
  const releaseVersion = requireEnv("CLIENT_RELEASE_VERSION");
  const artifactType = normalizeArtifactType(process.env.ANDROID_ARTIFACT_TYPE);
  const androidDir = normalizeString(
    process.env.ANDROID_PROJECT_DIR,
    path.join(clientDir, "src-tauri", "gen", "android"),
  );
  const keystorePath = normalizeString(
    process.env.ANDROID_KEYSTORE_PATH,
    path.join(
      normalizeString(process.env.RUNNER_TEMP, path.join(process.cwd(), ".tmp")),
      `${artifactName}.jks`,
    ),
  );
  const keystoreBase64 = normalizeString(process.env.ANDROID_KEYSTORE_BASE64);
  const keystorePassword = normalizeString(process.env.ANDROID_KEYSTORE_PASSWORD);
  const keyAlias = normalizeString(process.env.ANDROID_KEY_ALIAS);
  const keyPassword = normalizeString(process.env.ANDROID_KEY_PASSWORD);
  const blockers = collectBlockers({
    keystoreBase64,
    keystorePassword,
    keyAlias,
    keyPassword,
    androidDir,
  });
  const configured = blockers.length === 0;

  if (configured) {
    const keystorePropertiesPath = path.join(androidDir, "keystore.properties");
    const buildGradlePath = path.join(androidDir, "app", "build.gradle.kts");

    if (!existsSync(buildGradlePath)) {
      throw new Error(`Android Gradle 文件不存在: ${buildGradlePath}`);
    }

    mkdirSync(path.dirname(keystorePath), { recursive: true });
    writeFileSync(keystorePath, Buffer.from(keystoreBase64, "base64"));
    writeFileSync(
      keystorePropertiesPath,
      [
        `keyAlias=${keyAlias}`,
        `password=${keystorePassword}`,
        `keyPassword=${keyPassword}`,
        `storeFile=${keystorePath}`,
        "",
      ].join("\n"),
    );
    patchGradleFile(buildGradlePath);
  }

  writeReport({
    artifactName,
    releaseVersion,
    artifactType,
    androidDir,
    keystorePath,
    configured,
    blockers,
  });
  writeOutput("configured", configured ? "true" : "false");
  writeOutput("status", configured ? "ready-for-android-build" : "blocked");
  writeOutput("release_kind", configured ? `android-signed-${artifactType}` : "mobile-manifest-only");
}

main();
