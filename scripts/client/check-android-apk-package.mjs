import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { getClientBranding, resolveTemplateEnv } from "../lib/template-env.mjs";

const ROOT_DIR = path.resolve(import.meta.dirname, "..", "..");
const CLIENT_BRANDING = getClientBranding(resolveTemplateEnv(ROOT_DIR));
const ANDROID_APP_LABEL = CLIENT_BRANDING.clients.appMobile.installName;

const REQUIRED_BADGING_SNIPPETS = Object.freeze([
  "package: name='com.rtnn.app'",
  `application-label:'${ANDROID_APP_LABEL}'`,
  "application-icon-",
  `application: label='${ANDROID_APP_LABEL}'`,
]);

const REQUIRED_MANIFEST_SNIPPETS = Object.freeze([
  'package="com.rtnn.app"',
  'android:name="android.permission.CAMERA"',
  'android:name="android.permission.POST_NOTIFICATIONS"',
  'android:name="android.permission.READ_MEDIA_IMAGES"',
  'android:name="android.permission.READ_EXTERNAL_STORAGE"',
  'android:name="com.autonavi.minimap"',
  'android:name="com.baidu.BaiduMap"',
  'android:name="com.tencent.map"',
  'android:name="com.tencent.maplite"',
  'android:scheme="androidamap"',
  'android:scheme="amapuri"',
  'android:scheme="baidumap"',
  'android:scheme="qqmap"',
  'android:scheme="geo"',
  "android:icon=",
  "android:roundIcon=",
]);
const REQUIRED_MANIFEST_REGEXPS = Object.freeze([
  /android:name="android\.intent\.category\.LAUNCHER"|<category[^>]+android:name="[^"]*android\.intent\.category\.LAUNCHER"/,
]);

const REQUIRED_RESOURCE_SNIPPETS = Object.freeze([
  "com.rtnn.app:mipmap/rtnn_launcher_icon",
  "com.rtnn.app:drawable/rtnn_launcher_icon_foreground",
  "com.rtnn.app:color/rtnn_launcher_icon_background",
]);

const REQUIRED_BINARY_SNIPPETS = Object.freeze([
  "com.autonavi.minimap",
  "com.baidu.BaiduMap",
  "com.tencent.map",
  "com.tencent.maplite",
  "AndroidMap",
  "AndroidPermission",
  "AndroidNotification",
  "checkAppInstalled",
  "openNavigation",
  "queryIntentActivities",
  "native-map-no-handler",
  "permission-request-dispatched",
  "notification-dispatched",
]);

const BLOCKED_BINARY_SNIPPETS = Object.freeze([
  "https://app.example.com",
  "http://app.example.com",
  "https://0.0.0.0:5102",
  "http://0.0.0.0:5102",
  "https://localhost:5102",
  "http://localhost:5102",
  "https://127.0.0.1:5102",
  "http://127.0.0.1:5102",
  "app.rtnn.invalid",
]);

function normalizeString(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function findCommand(commandName) {
  const explicit = normalizeString(process.env[`${commandName.toUpperCase()}_PATH`]);
  if (explicit) {
    return explicit;
  }

  const androidHome = normalizeString(process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT);
  const candidates = [
    androidHome
      ? path.join(androidHome, "cmdline-tools", "latest", "bin", commandName)
      : "",
    androidHome ? findLatestBuildTool(androidHome, commandName) : "",
    path.join(process.env.HOME ?? "", "Library", "Android", "sdk", "cmdline-tools", "latest", "bin", commandName),
    findLatestBuildTool(path.join(process.env.HOME ?? "", "Library", "Android", "sdk"), commandName),
    commandName,
  ].filter(Boolean);

  return candidates.find((candidate) => candidate === commandName || existsSync(candidate));
}

function findLatestBuildTool(androidHome, commandName) {
  const buildToolsDir = path.join(androidHome, "build-tools");

  if (!existsSync(buildToolsDir)) {
    return "";
  }

  const versions = readdirSync(buildToolsDir)
    .map((name) => path.join(buildToolsDir, name, commandName))
    .filter((candidate) => existsSync(candidate))
    .sort();

  return versions.at(-1) ?? "";
}

function run(command, args) {
  return execFileSync(command, args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function assertIncludes(source, snippets, label) {
  for (const snippet of snippets) {
    assert(source.includes(snippet), `${label} 缺少 ${snippet}`);
  }
}

function assertExcludes(source, snippets, label) {
  for (const snippet of snippets) {
    assert(!source.includes(snippet), `${label} 不应包含 ${snippet}`);
  }
}

function walkFiles(dir) {
  const output = [];

  function walk(currentDir) {
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (entry.isFile()) {
        output.push(entryPath);
      }
    }
  }

  walk(dir);
  return output;
}

function runStrings(filePath) {
  return execFileSync("strings", [filePath], {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
}

function readExtractedTextCorpus(extractDir) {
  const files = walkFiles(extractDir);
  const interestingFiles = files.filter((filePath) => {
    const relativePath = path.relative(extractDir, filePath);
    return (
      relativePath === "assets/tauri.conf.json" ||
      relativePath === "AndroidManifest.xml" ||
      /^classes.*\.dex$/.test(relativePath) ||
      relativePath.endsWith(".so") ||
      relativePath.endsWith(".json") ||
      relativePath.endsWith(".xml")
    );
  });

  return {
    files: interestingFiles.map((filePath) => path.relative(extractDir, filePath)),
    text: interestingFiles
      .map((filePath) => {
        try {
          return runStrings(filePath);
        } catch {
          return readFileSync(filePath).toString("latin1");
        }
      })
      .join("\n"),
  };
}

function readBundledTauriConfig(extractDir) {
  const configPath = path.join(extractDir, "assets", "tauri.conf.json");

  if (!existsSync(configPath)) {
    return null;
  }

  return JSON.parse(readFileSync(configPath, "utf8"));
}

function normalizeUrlForCompare(value) {
  const normalized = normalizeString(value).replace(/\/+$/, "");
  return normalized || "";
}

function assertManifestUsesLauncherIcon(manifest, resources) {
  const match = resources.match(
    /spec resource (0x[0-9a-f]+) com\.rtnn\.app:mipmap\/rtnn_launcher_icon:/i,
  );
  assert(match, "APK resources 缺少 rtnn_launcher_icon resource id");

  const iconRef = `@ref/${match[1].toLowerCase()}`;
  const normalizedManifest = manifest.toLowerCase();
  assert(
    normalizedManifest.includes(`android:icon="${iconRef}"`),
    `APK manifest application icon 未指向 rtnn_launcher_icon: ${iconRef}`,
  );
  assert(
    normalizedManifest.includes(`android:roundicon="${iconRef}"`),
    `APK manifest roundIcon 未指向 rtnn_launcher_icon: ${iconRef}`,
  );

  return iconRef;
}

function assertExtractedLauncherIconFiles(extractDir) {
  const files = walkFiles(extractDir)
    .map((filePath) => path.relative(extractDir, filePath).replaceAll(path.sep, "/"))
    .filter((relativePath) => /rtnn_launcher_icon.*\.(png|xml)$/i.test(relativePath));

  // Android packaging can compile, deduplicate, or rename raw res files in the APK.
  // The authoritative checks are the manifest icon refs and the resource table
  // checks above. Keep extracted filenames only as diagnostic data.
  if (files.length > 0) {
    assert(
      files.some((relativePath) => /rtnn_launcher_icon\.(png|xml)$/i.test(relativePath)),
      "APK 解包后未发现 rtnn_launcher_icon 诊断资源",
    );
  }

  return files;
}

function writeReport(outputPath, report) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function main() {
  const apkPath = normalizeString(process.argv[2] ?? process.env.APK_PATH);
  assert(apkPath, "缺少 APK 路径参数");
  assert(existsSync(apkPath), `APK 不存在: ${apkPath}`);

  const aapt = findCommand("aapt");
  const apkanalyzer = findCommand("apkanalyzer");
  assert(aapt, "未找到 aapt，请配置 ANDROID_HOME 或 AAPT_PATH");
  assert(apkanalyzer, "未找到 apkanalyzer，请配置 ANDROID_HOME 或 APKANALYZER_PATH");

  const extractDir = mkdtempSync(path.join(tmpdir(), "rtnn-apk-check-"));

  try {
    run("unzip", ["-oq", apkPath, "-d", extractDir]);

    const badging = run(aapt, ["dump", "badging", apkPath]);
    const resources = run(aapt, ["dump", "resources", apkPath]);
    const manifest = run(apkanalyzer, ["manifest", "print", apkPath]);
    const corpus = readExtractedTextCorpus(extractDir);
    const bundledTauriConfig = readBundledTauriConfig(extractDir);
    const expectedWebUrl = normalizeString(process.env.CLIENT_WEB_URL);

    assertIncludes(badging, REQUIRED_BADGING_SNIPPETS, "APK badging");
    assertIncludes(manifest, REQUIRED_MANIFEST_SNIPPETS, "APK manifest");
    for (const regexp of REQUIRED_MANIFEST_REGEXPS) {
      assert(regexp.test(manifest), `APK manifest 缺少匹配: ${regexp}`);
    }
    assertIncludes(resources, REQUIRED_RESOURCE_SNIPPETS, "APK resources");
    const launcherIconRef = assertManifestUsesLauncherIcon(manifest, resources);
    const launcherIconFiles = assertExtractedLauncherIconFiles(extractDir);

    const requiredBinarySnippets = [
      ...REQUIRED_BINARY_SNIPPETS,
      expectedWebUrl,
    ].filter(Boolean);

    assertIncludes(corpus.text, requiredBinarySnippets, "APK extracted strings");
    assertExcludes(corpus.text, BLOCKED_BINARY_SNIPPETS, "APK extracted strings");

    if (expectedWebUrl) {
      const actualWebUrl = normalizeUrlForCompare(
        bundledTauriConfig?.build?.frontendDist,
      );
      assert(
        actualWebUrl === normalizeUrlForCompare(expectedWebUrl),
        `APK frontendDist 不匹配: expected ${expectedWebUrl}, got ${bundledTauriConfig?.build?.frontendDist ?? "<missing>"}`,
      );
    }

    const report = {
      schemaVersion: "rtnn.android-apk-check.v1",
      apkPath,
      size: statSync(apkPath).size,
      package: "com.rtnn.app",
      iconResource: "rtnn_launcher_icon",
      iconRef: launcherIconRef,
      iconFiles: launcherIconFiles,
      rawIconFileNamesPreserved: launcherIconFiles.length > 0,
      badgingMentionsLauncherIcon: badging.includes("rtnn_launcher_icon"),
      frontendDist: bundledTauriConfig?.build?.frontendDist ?? null,
      checked: {
        badging: REQUIRED_BADGING_SNIPPETS,
        manifest: REQUIRED_MANIFEST_SNIPPETS,
        resources: REQUIRED_RESOURCE_SNIPPETS,
        requiredBinarySnippets,
        blockedBinarySnippets: BLOCKED_BINARY_SNIPPETS,
        extractedFiles: corpus.files,
      },
    };
    const outputPath = normalizeString(
      process.env.APK_CHECK_REPORT_PATH,
      path.join("artifacts", "client-release", "android-apk-check.json"),
    );
    writeReport(outputPath, report);

    console.log(`[android-apk-check] ok ${apkPath} -> ${outputPath}`);
  } finally {
    rmSync(extractDir, { recursive: true, force: true });
  }
}

main();
