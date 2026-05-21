import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { getClientBranding, resolveTemplateEnv } from "../lib/template-env.mjs";

const CLIENTS = {
  "admin-tauri": {
    packageName: "@rtnn/admin-tauri",
    clientKey: "adminDesktop",
    identifier: "com.rtnn.admin",
    devUrl: "http://localhost:5101",
    remoteUrl: "https://admin.rtnn.invalid",
    capability: "default.json",
    permissions: ["core:default", "opener:default", "updater:default"],
    requiredCargoDependencies: ["serde_json", "tauri-plugin-opener", "tauri-plugin-updater"],
    requiredSourceSnippets: [
      "get_client_info",
      "open_external",
      "open_map_navigation",
      "tauri_plugin_updater::UpdaterExt",
      "check_update",
      "install_update",
    ],
  },
  "app-tauri": {
    packageName: "@rtnn/app-tauri",
    clientKey: "appMobile",
    identifier: "com.rtnn.app",
    devUrl: "http://localhost:5102",
    remoteUrl: "https://app.rtnn.invalid",
    capability: "mobile.json",
    permissions: [
      "core:default",
      "opener:default",
      "barcode-scanner:allow-scan",
      "barcode-scanner:allow-cancel",
      "barcode-scanner:allow-check-permissions",
      "barcode-scanner:allow-request-permissions",
      "barcode-scanner:allow-open-app-settings",
      "barcode-scanner:allow-vibrate",
      "notification:allow-is-permission-granted",
      "notification:allow-request-permission",
      "notification:allow-notify",
      "notification:allow-cancel",
      "notification:allow-get-pending",
      "notification:allow-create-channel",
      "notification:allow-delete-channel",
    ],
    requiredCargoDependencies: [
      "serde_json",
      "tauri-plugin-opener",
      "tauri-plugin-notification",
      "tauri-plugin-barcode-scanner",
    ],
    requiredAndroidCargoDependencies: ["jni", "ndk-context"],
    requiredSourceSnippets: [
      "get_client_info",
      "open_external",
      "open_in_app_webview",
      "open_map_navigation",
      "tauri_plugin_barcode_scanner::init",
      "tauri_plugin_notification::init",
      "opened-native-map",
      "check_map_installed",
      "detect_android_map_installed",
      "check_permission",
      "request_permission",
      "scan_barcode",
      "show_notification",
      "file.pick",
      "webview.open",
      "notification",
      "barcode.scan",
      "permission",
      "safe-area",
      "keyboard",
    ],
    requiredFiles: [
      "../../scripts/client/prepare-app-tauri-android.mjs",
      "../../scripts/client/sync-client-branding.mjs",
    ],
    requiredFileSnippets: {
      "../../scripts/client/prepare-app-tauri-android.mjs": [
        "AndroidMap",
        "AndroidPermission",
        "AndroidMedia",
        "AndroidBarcode",
        "AndroidNotification",
        "AndroidDiagnostics",
        "startCameraScan",
        "updateCameraScanRect",
        "stopCameraScan",
        "rtnn:android-barcode-scan-result",
        "barcodeOverlayRoot",
        "ensureBarcodeOverlayRoot",
        "JSONObject.quote",
        "ProcessCameraProvider",
        "ImageAnalysis",
        "PreviewView",
        "camera-camera2",
        "camera-lifecycle",
        "camera-view",
        "openNavigation",
        "queryIntentActivities",
        "AndroidTheme",
        "com.autonavi.minimap",
        "com.baidu.BaiduMap",
        "com.tencent.map",
        "com.tencent.maplite",
        "android.intent.category.LAUNCHER",
        'android:icon="@mipmap/rtnn_launcher_icon"',
        'android:roundIcon="@mipmap/rtnn_launcher_icon"',
        "isCaptureEnabled",
        "onPermissionRequest",
        "PermissionRequest.RESOURCE_VIDEO_CAPTURE",
        "pickImages",
        "captureImage",
        "scanBarcode",
        "BarcodeScanning",
        "com.google.mlkit:barcode-scanning",
        "androidx.camera:camera-camera2",
        "androidx.camera:camera-core",
        "androidx.camera:camera-lifecycle",
        "androidx.camera:camera-view",
        "barcode-not-found",
        "launchCameraCapture",
        "launchImagePicker",
        "rtnn:native-theme-change",
        "rtnn:android-native-ready",
        "patchAndroidManifest",
        "patchLauncherIcon",
        "rtnn_launcher_icon_foreground",
        "patchTauriAndroidVersionCode",
        "CLIENT_ANDROID_VERSION_CODE",
      ],
      "../../scripts/client/check-app-tauri-android.mjs": [
        'android:icon="@mipmap/rtnn_launcher_icon"',
        'android:roundIcon="@mipmap/rtnn_launcher_icon"',
        "com.autonavi.minimap",
        "com.baidu.BaiduMap",
        "com.tencent.map",
        "com.tencent.maplite",
        "rtnn:native-file-picker-closed",
        "rtnn:android-map-ready",
        "rtnn:android-native-ready",
        "AndroidPermission",
        "AndroidMedia",
        "AndroidBarcode",
        "AndroidNotification",
        "AndroidDiagnostics",
        "BarcodeScanning",
        "com.google.mlkit:barcode-scanning",
        "androidx.camera:camera-camera2",
        "androidx.camera:camera-core",
        "androidx.camera:camera-lifecycle",
        "androidx.camera:camera-view",
        "barcode-not-found",
        "openNavigation",
        "native-map-no-handler",
        "onPermissionRequest",
        "PermissionRequest.RESOURCE_VIDEO_CAPTURE",
      ],
      "../../scripts/client/sync-client-branding.mjs": [
        "getClientBranding",
        "clients.adminDesktop.installName",
        "clients.appMobile.installName",
        "resolveBrandMarkAsset",
        "buildShellIconSvg",
        "qlmanage",
        "icon:auto-resize",
      ],
    },
  },
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function findWorkspaceRoot(startDir) {
  let current = startDir;

  while (current !== path.dirname(current)) {
    if (existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }

    current = path.dirname(current);
  }

  return startDir;
}

function assertFile(filePath) {
  assert(existsSync(filePath), `缺少文件: ${filePath}`);
}

function assertRgbaPng(filePath) {
  const file = readFileSync(filePath);
  const signature = file.subarray(0, 8).toString("hex");
  const chunkType = file.subarray(12, 16).toString("ascii");
  const bitDepth = file[24];
  const colorType = file[25];

  assert(
    signature === "89504e470d0a1a0a" && chunkType === "IHDR",
    `图标不是有效 PNG: ${filePath}`,
  );
  assert(bitDepth === 8 && colorType === 6, `图标必须是 8-bit RGBA PNG: ${filePath}`);
}

function assertIco(filePath) {
  const file = readFileSync(filePath);

  assert(file.length > 6, `图标不是有效 ICO: ${filePath}`);
  assert(
    file.readUInt16LE(0) === 0 && file.readUInt16LE(2) === 1 && file.readUInt16LE(4) > 0,
    `图标不是有效 ICO: ${filePath}`,
  );
}

function validateClient(rootDir, clientName, expected) {
  const clientDir = path.join(rootDir, "clients", clientName);
  const srcTauriDir = path.join(clientDir, "src-tauri");
  const packageJson = readJson(path.join(clientDir, "package.json"));
  const tauriConfig = readJson(path.join(srcTauriDir, "tauri.conf.json"));
  const capability = readJson(
    path.join(srcTauriDir, "capabilities", expected.capability),
  );
  const cargoToml = readFileSync(path.join(srcTauriDir, "Cargo.toml"), "utf8");
  const rustSource = readFileSync(path.join(srcTauriDir, "src/lib.rs"), "utf8");

  assert(packageJson.name === expected.packageName, `${clientName} package name 不匹配`);
  assert(packageJson.scripts?.validate, `${clientName} 缺少 validate 脚本`);
  if (clientName === "app-tauri") {
    assert(packageJson.scripts?.["check:android"], `${clientName} 缺少 check:android 脚本`);
  }
  assert(
    packageJson.devDependencies?.["@tauri-apps/cli"],
    `${clientName} 缺少 @tauri-apps/cli`,
  );

  const branding = getClientBranding(resolveTemplateEnv(rootDir));
  const clientBranding = branding.clients[expected.clientKey];
  assert(clientBranding, `${clientName} 缺少客户端品牌配置: ${expected.clientKey}`);
  assert(
    tauriConfig.productName === clientBranding.installName,
    `${clientName} productName 不匹配`,
  );
  for (const windowConfig of tauriConfig.app?.windows ?? []) {
    assert(
      windowConfig.title === clientBranding.installName,
      `${clientName} window title 不匹配`,
    );
  }
  assert(tauriConfig.identifier === expected.identifier, `${clientName} identifier 不匹配`);
  assert(tauriConfig.build?.devUrl === expected.devUrl, `${clientName} devUrl 不匹配`);
  assert(
    tauriConfig.build?.frontendDist === expected.remoteUrl,
    `${clientName} frontendDist 应使用远程 URL`,
  );
  assert(tauriConfig.app?.withGlobalTauri === true, `${clientName} 必须启用 withGlobalTauri`);
  assert(
    tauriConfig.bundle?.icon?.includes("icons/icon.png"),
    `${clientName} bundle.icon 缺少 icons/icon.png`,
  );
  assert(
    tauriConfig.bundle?.icon?.includes("icons/icon.ico"),
    `${clientName} bundle.icon 缺少 Windows icons/icon.ico`,
  );

  assert(
    capability.remote?.urls?.includes(expected.devUrl),
    `${clientName} capability 缺少 devUrl remote 授权`,
  );
  assert(
    capability.remote?.urls?.includes(`${expected.devUrl}/*`),
    `${clientName} capability 缺少 devUrl 路径 remote 授权`,
  );
  assert(
    capability.remote?.urls?.includes(expected.remoteUrl),
    `${clientName} capability 缺少 remote URL 授权`,
  );
  assert(
    capability.remote?.urls?.includes(`${expected.remoteUrl}/*`),
    `${clientName} capability 缺少 remote URL 路径授权`,
  );
  for (const permission of expected.permissions) {
    assert(
      capability.permissions?.includes(permission),
      `${clientName} capability 缺少 ${permission}`,
    );
  }

  for (const dependency of expected.requiredCargoDependencies) {
    assert(
      cargoToml.includes(`${dependency} =`),
      `${clientName} Cargo.toml 缺少 ${dependency}`,
    );
  }

  for (const dependency of expected.requiredAndroidCargoDependencies ?? []) {
    assert(
      cargoToml.includes(`${dependency} =`),
      `${clientName} Cargo.toml 缺少 Android 依赖 ${dependency}`,
    );
  }

  for (const snippet of expected.requiredSourceSnippets) {
    assert(
      rustSource.includes(snippet),
      `${clientName} Rust 壳缺少 ${snippet}`,
    );
  }

  for (const relativeFilePath of expected.requiredFiles ?? []) {
    assertFile(path.resolve(clientDir, relativeFilePath));
  }

  for (const [relativeFilePath, snippets] of Object.entries(
    expected.requiredFileSnippets ?? {},
  )) {
    const filePath = path.resolve(clientDir, relativeFilePath);
    assertFile(filePath);
    const source = readFileSync(filePath, "utf8");
    for (const snippet of snippets) {
      assert(source.includes(snippet), `${clientName} ${relativeFilePath} 缺少 ${snippet}`);
    }
  }

  for (const filePath of [
    "Cargo.toml",
    "build.rs",
    "icons/icon.ico",
    "icons/icon.png",
    "src/lib.rs",
    "src/main.rs",
  ]) {
    assertFile(path.join(srcTauriDir, filePath));
  }

  assertRgbaPng(path.join(srcTauriDir, "icons/icon.png"));
  assertIco(path.join(srcTauriDir, "icons/icon.ico"));
}

function assertSharedShellIcons(rootDir) {
  const adminIcon = readFileSync(
    path.join(rootDir, "clients", "admin-tauri", "src-tauri", "icons", "icon.png"),
  );
  const appIcon = readFileSync(
    path.join(rootDir, "clients", "app-tauri", "src-tauri", "icons", "icon.png"),
  );

  assert(
    adminIcon.equals(appIcon),
    "admin-tauri 与 app-tauri 应使用同一套 RTNN 品牌 PNG 图标",
  );
}

function assertBrandIconGuide(rootDir) {
  const docPath = path.join(rootDir, "docs", "architecture", "client-shell-release-distribution.md");
  const doc = readFileSync(docPath, "utf8");
  const requiredSnippets = [
    "图标体系",
    "clients/app-tauri/src-tauri/icons/icon.png",
    "clients/admin-tauri/src-tauri/icons/icon.png",
    "apps/app/app/favicon.ico",
    "apps/admin/app/favicon.ico",
    "apps/app/public/brand/brand-mark.svg",
    "apps/admin/public/brand/brand-mark.svg",
    "rtnn_launcher_icon",
  ];

  for (const snippet of requiredSnippets) {
    assert(doc.includes(snippet), `客户端发布文档缺少图标维护说明: ${snippet}`);
  }
}

function assertSharedWebFavicons(rootDir) {
  const shellIcon = readFileSync(
    path.join(rootDir, "clients", "app-tauri", "src-tauri", "icons", "icon.ico"),
  );
  const appFavicon = readFileSync(path.join(rootDir, "apps", "app", "app", "favicon.ico"));
  const adminFavicon = readFileSync(
    path.join(rootDir, "apps", "admin", "app", "favicon.ico"),
  );

  assert(
    appFavicon.equals(shellIcon),
    "app favicon.ico 应与 RTNN 客户端壳 ICO 图标保持一致",
  );
  assert(
    adminFavicon.equals(shellIcon),
    "admin favicon.ico 应与 RTNN 客户端壳 ICO 图标保持一致",
  );
}

function assertSharedWebBrandMarks(rootDir) {
  const brandSource = readFileSync(
    path.join(rootDir, "packages", "config", "assets", "brand-mark.svg"),
  );
  const appBrandMark = readFileSync(
    path.join(rootDir, "apps", "app", "public", "brand", "brand-mark.svg"),
  );
  const adminBrandMark = readFileSync(
    path.join(rootDir, "apps", "admin", "public", "brand", "brand-mark.svg"),
  );
  const appLayout = readFileSync(path.join(rootDir, "apps", "app", "app", "layout.tsx"), "utf8");
  const adminLayout = readFileSync(
    path.join(rootDir, "apps", "admin", "app", "layout.tsx"),
    "utf8",
  );

  assert(
    appBrandMark.equals(adminBrandMark),
    "app 与 admin 应使用同一套 RTNN brand-mark.svg",
  );
  assert(
    appBrandMark.equals(brandSource) && adminBrandMark.equals(brandSource),
    "web brand-mark.svg 必须由 packages/config/assets/brand-mark.svg 同步生成",
  );
  assert(
    appLayout.includes('/brand/brand-mark.svg'),
    "app metadata icons 应指向 /brand/brand-mark.svg",
  );
  assert(
    adminLayout.includes('/brand/brand-mark.svg'),
    "admin metadata icons 应指向 /brand/brand-mark.svg",
  );
}

function assertNoUserFacingLegacyBranding(rootDir) {
  const ignoredDirs = new Set([
    ".git",
    ".next",
    "dist",
    "node_modules",
    "target",
    "src-tauri",
    ".turbo",
  ]);
  const ignoredFiles = new Set([
    path.normalize("scripts/client/check-tauri-clients.mjs"),
    path.normalize("apps/backend/openapi.json"),
    path.normalize("packages/api-sdk/src/generated/openapi.ts"),
    path.normalize("packages/config/src/index.ts"),
    path.normalize("scripts/lib/template-env.mjs"),
    path.normalize("scripts/client/sync-client-branding.mjs"),
  ]);
  const targetDirs = ["apps", "clients", "packages", "scripts"].map((item) =>
    path.join(rootDir, item),
  );
  const blockedPatterns = [
    {
      pattern: new RegExp(`\\b${["RTNN", "App"].join(" ")}\\b`),
      label: ["RTNN", "App"].join(" "),
    },
    {
      pattern: new RegExp(`application-label:'${["RTNN", "App"].join(" ")}'`),
      label: `APK ${["RTNN", "App"].join(" ")} label`,
    },
    {
      pattern: /<title>RTNN<\/title>/,
      label: "HTML title RTNN",
    },
    {
      pattern: /title:\s*["']RTNN["']/,
      label: "metadata title RTNN",
    },
    {
      pattern: /title:\s*["']RTNN Admin["']/,
      label: "metadata title RTNN Admin",
    },
    {
      pattern: /title:\s*["']RTNN App["']/,
      label: "metadata title RTNN App",
    },
  ];

  function collectFiles(dir) {
    const files = [];

    function visit(currentDir) {
      for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (!ignoredDirs.has(entry.name)) {
            visit(path.join(currentDir, entry.name));
          }
          continue;
        }
        if (!entry.isFile()) {
          continue;
        }
        const filePath = path.join(currentDir, entry.name);
        const relativePath = path.normalize(path.relative(rootDir, filePath));
        if (ignoredFiles.has(relativePath)) {
          continue;
        }
        if (!/\.(ts|tsx|js|mjs|json|md|html|xml|toml)$/.test(entry.name)) {
          continue;
        }
        files.push(filePath);
      }
    }
    visit(dir);
    return files;
  }

  const files = targetDirs.flatMap(collectFiles);
  const violations = [];

  for (const filePath of files) {
    const source = readFileSync(filePath, "utf8");
    for (const item of blockedPatterns) {
      if (item.pattern.test(source)) {
        violations.push(`${path.relative(rootDir, filePath)}: ${item.label}`);
      }
    }
  }

  assert(
    violations.length === 0,
    `发现旧客户端品牌硬编码:\n${violations.join("\n")}`,
  );
}

function main() {
  const rootDir = findWorkspaceRoot(process.cwd());
  const requested = process.argv.slice(2);
  const clientNames = requested.length > 0 ? requested : Object.keys(CLIENTS);

  for (const clientName of clientNames) {
    const expected = CLIENTS[clientName];
    assert(expected, `未知 Tauri client: ${clientName}`);
    validateClient(rootDir, clientName, expected);
    console.log(`[tauri-client-check] ${clientName} 通过`);
  }

  if (clientNames.includes("admin-tauri") && clientNames.includes("app-tauri")) {
    assertSharedShellIcons(rootDir);
    console.log("[tauri-client-check] shell 图标一致性通过");
    assertSharedWebFavicons(rootDir);
    console.log("[tauri-client-check] web favicon 一致性通过");
    assertSharedWebBrandMarks(rootDir);
    console.log("[tauri-client-check] web brand mark 一致性通过");
    assertBrandIconGuide(rootDir);
    console.log("[tauri-client-check] 图标体系说明通过");
    assertNoUserFacingLegacyBranding(rootDir);
    console.log("[tauri-client-check] 用户可见旧品牌硬编码检查通过");
  }
}

main();
