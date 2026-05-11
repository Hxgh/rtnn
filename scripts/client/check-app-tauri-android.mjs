import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const REQUIRED_MANIFEST_SNIPPETS = Object.freeze([
  'android:icon="@mipmap/rtnn_launcher_icon"',
  'android:roundIcon="@mipmap/rtnn_launcher_icon"',
  "android.permission.CAMERA",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.hardware.camera",
  "androidx.core.content.FileProvider",
  "com.autonavi.minimap",
  "com.baidu.BaiduMap",
  "com.tencent.map",
  "com.tencent.maplite",
  'android:scheme="androidamap"',
  'android:scheme="amapuri"',
  'android:scheme="baidumap"',
  'android:scheme="qqmap"',
  'android:scheme="geo"',
]);
const REQUIRED_MANIFEST_REGEXPS = Object.freeze([
  /android:name="android\.intent\.category\.LAUNCHER"|<category[^>]+android:name="[^"]*android\.intent\.category\.LAUNCHER"/,
]);

const REQUIRED_MAIN_ACTIVITY_SNIPPETS = Object.freeze([
  "AndroidMap",
  "AndroidPermission",
  "AndroidMedia",
  "AndroidBarcode",
  "AndroidNotification",
  "AndroidDiagnostics",
  "checkAppInstalled",
  "openNavigation",
  "queryIntentActivities",
  "native-map-no-handler",
  "getLaunchIntentForPackage",
  "getPackageInfo",
  "map-app-not-installed-or-not-visible",
  "notifyFilePickerClosed",
  "onShowFileChooser",
  "onPermissionRequest",
  "PermissionRequest.RESOURCE_VIDEO_CAPTURE",
  "pickImages",
  "captureImage",
  "scanBarcode",
  "BarcodeScanning",
  "buildMediaResult",
  "barcode-not-found",
  "launchImagePicker",
  "launchCameraCapture",
  "camera-permission-denied",
  "POST_NOTIFICATIONS",
  "permission-request-dispatched",
  "notification-dispatched",
  "rtnn:native-file-picker-closed",
  "rtnn:android-map-ready",
  "rtnn:android-native-ready",
]);
const REQUIRED_GRADLE_SNIPPETS = Object.freeze([
  "androidx.activity:activity-ktx",
  "androidx.core:core-ktx",
  "androidx.core:core",
  "com.google.mlkit:barcode-scanning",
]);

const REQUIRED_ICON_FILES = Object.freeze([
  "res/drawable/rtnn_launcher_icon.png",
  "res/drawable/rtnn_launcher_icon_foreground.png",
  "res/mipmap-mdpi/rtnn_launcher_icon.png",
  "res/mipmap-hdpi/rtnn_launcher_icon.png",
  "res/mipmap-xhdpi/rtnn_launcher_icon.png",
  "res/mipmap-xxhdpi/rtnn_launcher_icon.png",
  "res/mipmap-xxxhdpi/rtnn_launcher_icon.png",
  "res/mipmap-mdpi/rtnn_launcher_icon_foreground.png",
  "res/mipmap-hdpi/rtnn_launcher_icon_foreground.png",
  "res/mipmap-xhdpi/rtnn_launcher_icon_foreground.png",
  "res/mipmap-xxhdpi/rtnn_launcher_icon_foreground.png",
  "res/mipmap-xxxhdpi/rtnn_launcher_icon_foreground.png",
  "res/mipmap-anydpi-v26/rtnn_launcher_icon.xml",
  "res/values/rtnn_launcher_icon_colors.xml",
  "res/xml/file_paths.xml",
]);

function normalizeString(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function resolveExistingPath(...candidates) {
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates.find(Boolean);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source, snippets, label) {
  for (const snippet of snippets) {
    assert(source.includes(snippet), `${label} 缺少 ${snippet}`);
  }
}

function assertRgbaPng(filePath) {
  const file = readFileSync(filePath);
  const signature = file.subarray(0, 8).toString("hex");
  const chunkType = file.subarray(12, 16).toString("ascii");
  const bitDepth = file[24];
  const colorType = file[25];

  assert(
    signature === "89504e470d0a1a0a" && chunkType === "IHDR",
    `Android launcher 图标不是有效 PNG: ${filePath}`,
  );
  assert(
    bitDepth === 8 && colorType === 6,
    `Android launcher 图标必须是 8-bit RGBA PNG: ${filePath}`,
  );
}

function findMainActivity(androidDir, packageName) {
  const packagePath = packageName.replace(/\./g, "/");
  const expected = path.join(
    androidDir,
    "app",
    "src",
    "main",
    "java",
    packagePath,
    "MainActivity.kt",
  );

  if (existsSync(expected)) {
    return expected;
  }

  const javaRoot = path.join(androidDir, "app", "src", "main", "java");
  const matches = [];

  function walk(dir) {
    if (!existsSync(dir)) {
      return;
    }

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (entry.name === "MainActivity.kt") {
        matches.push(entryPath);
      }
    }
  }

  walk(javaRoot);

  assert(matches.length === 1, `无法定位 Android MainActivity.kt: ${javaRoot}`);
  return matches[0];
}

function main() {
  const rawClientDir = normalizeString(process.env.CLIENT_DIR);
  const clientDir = resolveExistingPath(
    rawClientDir,
    rawClientDir ? path.resolve(process.cwd(), rawClientDir) : "",
    path.resolve(process.cwd(), "clients", "app-tauri"),
    process.cwd(),
  );
  const srcTauriDir = path.join(clientDir, "src-tauri");
  const rawAndroidDir = normalizeString(process.env.ANDROID_PROJECT_DIR);
  const androidDir = resolveExistingPath(
    rawAndroidDir,
    rawAndroidDir ? path.resolve(process.cwd(), rawAndroidDir) : "",
    path.join(srcTauriDir, "gen", "android"),
  );

  assert(existsSync(androidDir), `Android 生成工程不存在: ${androidDir}`);

  const tauriConfig = readJson(path.join(srcTauriDir, "tauri.conf.json"));
  const packageName = normalizeString(tauriConfig.identifier);
  assert(packageName, "clients/app-tauri/src-tauri/tauri.conf.json 缺少 identifier");

  const mainDir = path.join(androidDir, "app", "src", "main");
  const manifestPath = path.join(mainDir, "AndroidManifest.xml");
  const mainActivityPath = findMainActivity(androidDir, packageName);
  const gradlePath = path.join(androidDir, "app", "build.gradle.kts");
  const iconSourcePath = path.join(srcTauriDir, "icons", "icon.png");
  const launcherPath = path.join(mainDir, "res", "drawable", "rtnn_launcher_icon.png");
  const manifest = readFileSync(manifestPath, "utf8");
  const mainActivity = readFileSync(mainActivityPath, "utf8");
  const gradle = readFileSync(gradlePath, "utf8");
  const sourceIcon = readFileSync(iconSourcePath);
  const launcherIcon = readFileSync(launcherPath);

  assertIncludes(manifest, REQUIRED_MANIFEST_SNIPPETS, "AndroidManifest.xml");
  for (const regexp of REQUIRED_MANIFEST_REGEXPS) {
    assert(regexp.test(manifest), `AndroidManifest.xml 缺少匹配: ${regexp}`);
  }
  assertIncludes(mainActivity, REQUIRED_MAIN_ACTIVITY_SNIPPETS, "MainActivity.kt");
  assertIncludes(gradle, REQUIRED_GRADLE_SNIPPETS, "app/build.gradle.kts");

  for (const relativePath of REQUIRED_ICON_FILES) {
    const filePath = path.join(mainDir, relativePath);
    assert(existsSync(filePath), `缺少 Android launcher/权限资源: ${filePath}`);
    assert(statSync(filePath).size > 0, `Android 资源为空: ${filePath}`);
  }

  assertRgbaPng(iconSourcePath);
  assertRgbaPng(launcherPath);
  assert(
    launcherIcon.equals(sourceIcon),
    "Android launcher 图标必须来自 app-tauri/src-tauri/icons/icon.png",
  );

  console.log(`[app-tauri-android-check] ok ${androidDir}`);
}

main();
