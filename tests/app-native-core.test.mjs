import assert from "node:assert/strict";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const repoRoot = path.resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const nativeBridgeDistPath = path
  .join(repoRoot, "packages/native-bridge/dist/index.js")
  .replaceAll(path.sep, "/");
const appReactPath = require
  .resolve("react", { paths: [path.join(repoRoot, "apps/app")] })
  .replaceAll(path.sep, "/");
const appReactJsxRuntimePath = require
  .resolve("react/jsx-runtime", { paths: [path.join(repoRoot, "apps/app")] })
  .replaceAll(path.sep, "/");
const appOrigin = "https://app.rtnn.invalid";

async function importAppNativeCore() {
  const sourceDir = path.join(repoRoot, "apps/app/lib/native-core");
  const testModuleDir = path.join(repoRoot, ".tmp-tests");

  mkdirSync(testModuleDir, { recursive: true });

  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const source = readFileSync(sourcePath, "utf8");
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    const runnableSource = transpiled
      .replace(/from "react\/jsx-runtime"/g, `from "file://${appReactJsxRuntimePath}"`)
      .replace(/from "react"/g, `from "file://${appReactPath}"`)
      .replace(
        /from "@rtnn\/native-bridge"/g,
        `from "file://${nativeBridgeDistPath}"`,
      )
      .replace(
        /from "@rtnn\/shared-types"/g,
        `from "file://${path
          .join(repoRoot, "packages/shared-types/src/index.ts")
          .replaceAll(path.sep, "/")}"`,
      )
      .replace(/from "\.\/([^"]+)"/g, 'from "./$1.mjs"');
    const testModulePath = path.join(
      testModuleDir,
      entry.name.replace(/\.ts$/, ".mjs"),
    );

    writeFileSync(testModulePath, runnableSource);
  }

  return import(`file://${path.join(testModuleDir, "index.mjs")}?t=${Date.now()}`);
}

function createBridge(calls, overrides = {}) {
  return {
    async getClientInfo() {
      calls.push(["getClientInfo"]);
      return {
        runtime: "tauri",
        shell: "app-mobile",
        platform: "android",
        appVersion: "0.1.0",
        bridgeVersion: "0.1.0",
        channel: "testing",
        features: [
          "external.open",
          "webview.open",
          "map.navigation",
          "file.pick",
          "permission",
          "safe-area",
          "keyboard",
        ],
      };
    },
    async openExternal(input) {
      calls.push(["openExternal", input.url]);
      return { ok: true };
    },
    async openInAppWebView(input) {
      calls.push(["openInAppWebView", input.url]);
      return { ok: true, message: "opened-in-app-webview" };
    },
    async openMapNavigation(input) {
      calls.push(["openMapNavigation", input.appType, input.allowWebFallback]);
      return { ok: true };
    },
    async checkMapInstalled(input) {
      calls.push(["checkMapInstalled", input.appType]);
      return {
        ok: true,
        appType: input.appType,
        installed: input.appType === "amap",
        status: input.appType === "baidu" ? "not-installed" : "installed",
      };
    },
    async checkPermission(input) {
      calls.push(["checkPermission", input.kind, input.trigger]);
      return {
        ok: true,
        kind: input.kind,
        status: "prompt",
        requested: false,
      };
    },
    async requestPermission(input) {
      calls.push(["requestPermission", input.kind, input.trigger, input.purpose]);
      return {
        ok: true,
        kind: input.kind,
        status: "granted",
        requested: true,
      };
    },
    async ensurePermission(input) {
      calls.push(["ensurePermission", input.kind, input.trigger, input.purpose]);
      return {
        ok: true,
        kind: input.kind,
        status: "granted",
        requested: true,
      };
    },
    async pickImages(input) {
      calls.push(["pickImages", input?.capture ?? null, input?.timeoutMs ?? null]);
      return {
        ok: true,
        files: [
          {
            name: "image.jpg",
            type: "image/jpeg",
            size: 1024,
            dataUrl: "data:image/jpeg;base64,AA==",
          },
        ],
      };
    },
    async scanBarcode(input) {
      calls.push([
        "scanBarcode",
        input?.timeoutMs ?? null,
        input?.source ?? null,
        input?.formats ?? null,
      ]);
      return {
        ok: true,
        codes: [
          {
            rawValue: "rtnn-test",
            format: "qr_code",
          },
        ],
      };
    },
    async showNotification(input) {
      calls.push(["showNotification", input.title]);
      return { ok: true, message: "notification-dispatched" };
    },
    async checkUpdate() {
      calls.push(["checkUpdate"]);
      return { ok: false, update: { available: false } };
    },
    async installUpdate() {
      calls.push(["installUpdate"]);
      return { ok: false };
    },
    ...overrides,
  };
}

test("app native core keeps permission timing action driven", async () => {
  const { createAppNativeCore } = await importAppNativeCore();
  const calls = [];
  const core = createAppNativeCore(createBridge(calls));

  assert.deepEqual(core.getActionPermissionKinds("media.pick-album"), [
    "photo-library",
  ]);
  assert.deepEqual(core.getActionPermissionKinds("media.capture-camera"), [
    "camera",
  ]);
  assert.deepEqual(core.getActionPermissionKinds("map.navigation"), []);

  await core.checkPermissions(["photo-library", "camera"]);
  assert.deepEqual(calls, [
    ["checkPermission", "photo-library", "manual"],
    ["checkPermission", "camera", "manual"],
  ]);

  calls.length = 0;
  await core.openMapNavigation({
    appType: "amap",
    lat: 30.2741,
    lng: 120.1551,
    name: "杭州西湖",
    allowWebFallback: false,
  });
  assert.deepEqual(calls, [
    ["checkMapInstalled", "amap"],
    ["openMapNavigation", "amap", false],
  ]);
});

test("app native core still allows web fallback for preferred map auto open", async () => {
  const { createAppNativeCore } = await importAppNativeCore();
  const calls = [];
  const core = createAppNativeCore(createBridge(calls));

  await core.openMapNavigation({
    lat: 30.2741,
    lng: 120.1551,
    name: "杭州西湖",
  });

  assert.deepEqual(calls, [
    ["checkMapInstalled", "amap"],
    ["openMapNavigation", "amap", true],
  ]);
});

test("app native core separates external open from in-app webview", async () => {
  const { createAppNativeCore } = await importAppNativeCore();
  const calls = [];
  const assigned = [];
  const originalWindow = globalThis.window;
  globalThis.window = {
    location: {
      href: `${appOrigin}/device-services`,
      assign(url) {
        assigned.push(url);
      },
    },
  };
  const core = createAppNativeCore(createBridge(calls));

  try {
    assert.deepEqual(await core.openExternalUrl("https://example.com/download"), {
      ok: true,
    });
    assert.deepEqual(await core.openInAppWebView(`${appOrigin}/download`), {
      ok: true,
      message: "opened-in-app-webview",
    });
    assert.deepEqual(calls, [
      ["openExternal", "https://example.com/download"],
    ]);
    assert.deepEqual(assigned, [
      `${appOrigin}/download`,
    ]);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("app native core opens generic app URL inside the shell", async () => {
  const { createAppNativeCore } = await importAppNativeCore();
  const calls = [];
  const originalWindow = globalThis.window;
  const assigned = [];
  globalThis.window = {
    location: {
      href: `${appOrigin}/me`,
      assign(url) {
        assigned.push(url);
      },
    },
  };
  const core = createAppNativeCore(createBridge(calls));

  try {
    assert.deepEqual(await core.openUrl(`${appOrigin}/download`), {
      ok: true,
      message: "opened-in-app-webview",
    });
    assert.deepEqual(calls, []);
    assert.deepEqual(assigned, [
      `${appOrigin}/download`,
    ]);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("app native core opens same-origin URLs inside the shell", async () => {
  const { createAppNativeCore } = await importAppNativeCore();
  const calls = [];
  const assigned = [];
  const originalWindow = globalThis.window;
  globalThis.window = {
    location: {
      href: `${appOrigin}/native-diagnostics`,
      assign(url) {
        assigned.push(url);
      },
    },
  };
  const core = createAppNativeCore(createBridge(calls));

  try {
    assert.deepEqual(await core.openInAppWebView("/download"), {
      ok: true,
      message: "opened-in-app-webview",
    });
    assert.deepEqual(assigned, [
      `${appOrigin}/download`,
    ]);
    assert.deepEqual(calls, []);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("app native core rejects cross-origin shell navigation", async () => {
  const { createAppNativeCore } = await importAppNativeCore();
  const calls = [];
  const assigned = [];
  const originalWindow = globalThis.window;
  globalThis.window = {
    location: {
      href: `${appOrigin}/me`,
      assign(url) {
        assigned.push(url);
      },
    },
  };
  const core = createAppNativeCore(createBridge(calls));

  try {
    assert.deepEqual(await core.openUrl("https://example.com/download"), {
      ok: false,
      reason: "webview-url-not-allowed",
    });
    assert.deepEqual(calls, []);
    assert.deepEqual(assigned, []);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("app native core accepts same-origin relative in-app webview URLs", async () => {
  const { createAppNativeCore } = await importAppNativeCore();
  const calls = [];
  const assigned = [];
  const originalWindow = globalThis.window;
  globalThis.window = {
    location: {
      href: `${appOrigin}/native-diagnostics`,
      assign(url) {
        assigned.push(url);
      },
    },
  };
  const core = createAppNativeCore(createBridge(calls));

  try {
    assert.deepEqual(await core.openInAppWebView("/download"), {
      ok: true,
      message: "opened-in-app-webview",
    });
    assert.deepEqual(await core.openInAppWebView("https://example.com/download"), {
      ok: false,
      reason: "webview-url-not-allowed",
    });
    assert.deepEqual(assigned, [
      `${appOrigin}/download`,
    ]);
    assert.deepEqual(calls, []);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("app barcode scanner classifies product-length numeric codes", async () => {
  const { normalizeWebBarcodeResult } = await importAppNativeCore();

  assert.equal(normalizeWebBarcodeResult("6901234567890").contentType, "product");
  assert.equal(normalizeWebBarcodeResult("https://rtnn.dev").contentType, "url");
  assert.equal(normalizeWebBarcodeResult("WIFI:S:RTNN;T:WPA;P:secret;;").contentType, "wifi");
  assert.equal(normalizeWebBarcodeResult("geo:30.2741,120.1551").contentType, "geo");
});

test("app barcode scanner falls back to web only when native scan is unavailable", async () => {
  const { shouldFallbackBarcodeScanToWeb } = await importAppNativeCore();

  assert.equal(shouldFallbackBarcodeScanToWeb("barcode-scan-native-unavailable"), true);
  assert.equal(shouldFallbackBarcodeScanToWeb("plugin:barcode-scanner not initialized"), true);
  assert.equal(shouldFallbackBarcodeScanToWeb("unknown command scan_barcode"), true);
  assert.equal(shouldFallbackBarcodeScanToWeb("barcode-scan-cancelled"), false);
  assert.equal(shouldFallbackBarcodeScanToWeb("camera-permission-denied"), false);
  assert.equal(shouldFallbackBarcodeScanToWeb("file-picker-timeout"), false);
});

test("app barcode scanner can drive Android native camera session", async () => {
  const {
    nativeBarcodeCameraResultEvent,
    startNativeBarcodeCameraSession,
    subscribeNativeBarcodeCameraResult,
  } = await importAppNativeCore();
  const originalWindow = globalThis.window;
  const calls = [];
  const listeners = new Map();
  let rafCallback = null;

  globalThis.window = {
    devicePixelRatio: 3,
    AndroidBarcode: {
      startCameraScan(optionsJson) {
        calls.push(["start", JSON.parse(optionsJson)]);
        return JSON.stringify({ ok: true, dispatched: true, codes: [] });
      },
      updateCameraScanRect(optionsJson) {
        calls.push(["update", JSON.parse(optionsJson)]);
        return JSON.stringify({ ok: true, codes: [] });
      },
      stopCameraScan() {
        calls.push(["stop"]);
        return JSON.stringify({ ok: true, codes: [] });
      },
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    requestAnimationFrame(callback) {
      rafCallback = callback;
      return 1;
    },
    visualViewport: {
      addEventListener(type, listener) {
        listeners.set(`visualViewport:${type}`, listener);
      },
      removeEventListener(type) {
        listeners.delete(`visualViewport:${type}`);
      },
    },
  };

  try {
    const element = {
      getBoundingClientRect() {
        return {
          left: 11,
          top: 17,
          width: 240,
          height: 360,
        };
      },
    };
    const result = startNativeBarcodeCameraSession({ element });

    assert.equal(result.ok, true);
    assert.deepEqual(calls[0], [
      "start",
      {
        source: "camera",
        rect: {
          x: 33,
          y: 51,
          width: 720,
          height: 1080,
        },
      },
    ]);

    listeners.get("resize")?.();
    rafCallback?.();
    assert.equal(calls[1][0], "update");
    assert.deepEqual(calls[1][1].rect, {
      x: 33,
      y: 51,
      width: 720,
      height: 1080,
    });

    const handled = [];
    const unsubscribe = subscribeNativeBarcodeCameraResult((scanResult) => {
      handled.push(scanResult);
    });
    listeners.get(nativeBarcodeCameraResultEvent)?.({
      detail: {
        ok: true,
        codes: [{ rawValue: "6901234567890", format: "ean_13" }],
      },
    });
    unsubscribe();
    assert.deepEqual(handled, [
      {
        ok: true,
        codes: [{ rawValue: "6901234567890", format: "ean_13" }],
        reason: undefined,
      },
    ]);

    result.session.stop();
    assert.deepEqual(calls.at(-1), ["stop"]);
    assert.equal(listeners.has("resize"), false);
    assert.equal(listeners.has("visualViewport:resize"), false);
    assert.equal(listeners.has("visualViewport:scroll"), false);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("app native core requests only the permission needed by media action", async () => {
  const { createAppNativeCore } = await importAppNativeCore();
  const calls = [];
  const core = createAppNativeCore(createBridge(calls));

  assert.deepEqual(await core.pickMedia("album"), {
    ok: true,
    action: "media.pick-album",
    source: "album",
    permissions: [
      {
        ok: true,
        kind: "photo-library",
        status: "prompt",
        requested: false,
      },
    ],
    files: [
      {
        name: "image.jpg",
        type: "image/jpeg",
        size: 1024,
        dataUrl: "data:image/jpeg;base64,AA==",
      },
    ],
  });
  assert.deepEqual(calls, [
    ["checkPermission", "photo-library", "on-demand"],
    ["pickImages", null, null],
  ]);

  calls.length = 0;
  await core.pickMedia("camera");
  assert.deepEqual(calls, [
    ["ensurePermission", "camera", "on-demand", "capture-image"],
    ["pickImages", "environment", null],
  ]);
});

test("app native core keeps barcode and notification behind core service actions", async () => {
  const { createAppNativeCore } = await importAppNativeCore();
  const calls = [];
  const core = createAppNativeCore(createBridge(calls));

  assert.deepEqual(await core.scanBarcode({ timeoutMs: 1234 }), {
    ok: true,
    action: "barcode.scan",
    permissions: [],
    codes: [
      {
        rawValue: "rtnn-test",
        format: "qr_code",
      },
    ],
  });
  assert.deepEqual(await core.showNotification(), {
    ok: true,
    message: "notification-dispatched",
  });
  assert.deepEqual(calls, [
    ["scanBarcode", 1234, "camera", null],
    ["ensurePermission", "notification", "on-demand", "enable-notification"],
    ["showNotification", "RTNN"],
  ]);
});

test("app native core can scan barcode from an image source", async () => {
  const { createAppNativeCore } = await importAppNativeCore();
  const calls = [];
  const core = createAppNativeCore(createBridge(calls));

  assert.equal(
    (await core.scanBarcode({ source: "image", timeoutMs: 2000 })).codes[0].rawValue,
    "rtnn-test",
  );
  assert.deepEqual(calls, [
    ["checkPermission", "photo-library", "on-demand"],
    ["scanBarcode", 2000, "image", null],
  ]);
});

test("app native core blocks manually selected uncertain map apps", async () => {
  const { createAppNativeCore } = await importAppNativeCore();
  const calls = [];
  const core = createAppNativeCore(
    createBridge(calls, {
      async checkMapInstalled(input) {
        calls.push(["checkMapInstalled", input.appType]);
        return {
          ok: false,
          appType: input.appType,
          installed: false,
          status: "not-installed",
          reason: "map-app-not-installed-or-not-visible",
        };
      },
      async openMapNavigation(input) {
        calls.push(["openMapNavigation", input.appType, input.allowWebFallback]);
        return { ok: true, message: "opened-native-map" };
      },
    }),
  );

  assert.equal(
    (await core.getMapCandidates()).find((item) => item.appType === "amap")
      ?.available,
    false,
  );
  assert.deepEqual(
    await core.openMapNavigation({
      appType: "amap",
      lat: 30.2741,
      lng: 120.1551,
      name: "杭州西湖",
      allowWebFallback: false,
    }),
    {
      ok: false,
      reason: "map-app-not-installed-or-not-visible",
    },
  );
  assert.deepEqual(calls, [
    ["checkMapInstalled", "amap"],
    ["checkMapInstalled", "baidu"],
    ["checkMapInstalled", "tencent"],
    ["checkMapInstalled", "amap"],
  ]);
});

test("app native core skips clearly missing map apps during automatic open", async () => {
  const { createAppNativeCore } = await importAppNativeCore();
  const calls = [];
  const core = createAppNativeCore(
    createBridge(calls, {
      async checkMapInstalled(input) {
        calls.push(["checkMapInstalled", input.appType]);
        return {
          ok: false,
          appType: input.appType,
          installed: false,
          status: "not-installed",
          reason: "map-app-not-installed",
        };
      },
      async openMapNavigation(input) {
        calls.push(["openMapNavigation", input.appType, input.allowWebFallback]);
        return { ok: true };
      },
    }),
  );

  assert.deepEqual(
    await core.openMapNavigation({
      lat: 30.2741,
      lng: 120.1551,
      name: "杭州西湖",
    }),
    {
      ok: false,
      reason: "map-app-not-installed",
    },
  );
  assert.deepEqual(calls, [
    ["checkMapInstalled", "amap"],
    ["checkMapInstalled", "baidu"],
    ["checkMapInstalled", "tencent"],
  ]);
});

test("app native theme sync resolves system mode and calls Android bridge", async () => {
  const { syncAppNativeTheme } = await importAppNativeCore();
  const classState = new Map();
  const attrs = new Map();
  const styles = new Map();
  const meta = { name: "theme-color", content: "" };
  const calls = [];
  const root = {
    classList: {
      toggle(name, enabled) {
        classState.set(name, enabled);
      },
    },
    style: {
      set colorScheme(value) {
        styles.set("colorScheme", value);
      },
    },
    setAttribute(name, value) {
      attrs.set(name, value);
    },
  };
  const doc = {
    documentElement: root,
    head: {
      append(node) {
        calls.push(["appendMeta", node.name]);
      },
    },
    querySelector(selector) {
      calls.push(["querySelector", selector]);
      return meta;
    },
    createElement(tag) {
      calls.push(["createElement", tag]);
      return { name: "", content: "" };
    },
  };
  const win = {
    document: doc,
    __RTNN_SYSTEM_THEME__: "dark",
    matchMedia() {
      return { matches: false };
    },
    AndroidTheme: {
      setTheme(theme, mode) {
        calls.push(["setTheme", theme, mode]);
      },
    },
  };

  assert.equal(syncAppNativeTheme("system", { window: win }), "dark");
  assert.equal(classState.get("dark"), true);
  assert.equal(styles.get("colorScheme"), "dark");
  assert.equal(attrs.get("data-theme"), "dark");
  assert.equal(meta.content, "#171717");
  assert.deepEqual(calls, [
    ["querySelector", 'meta[name="theme-color"]'],
    ["setTheme", "dark", "system"],
  ]);
});

test("app native core passes media timeout and returns cancelled picker state", async () => {
  const { createAppNativeCore } = await importAppNativeCore();
  const calls = [];
  const core = createAppNativeCore(
    createBridge(calls, {
      async pickImages(input) {
        calls.push(["pickImages", input?.capture ?? null, input?.timeoutMs ?? null]);
        return {
          ok: false,
          files: [],
          reason: "file-picker-cancelled",
        };
      },
    }),
  );

  assert.deepEqual(await core.pickMedia("album", { timeoutMs: 12_000 }), {
    ok: false,
    action: "media.pick-album",
    source: "album",
    permissions: [
      {
        ok: true,
        kind: "photo-library",
        status: "prompt",
        requested: false,
      },
    ],
    files: [],
    reason: "file-picker-cancelled",
  });
  assert.deepEqual(calls, [
    ["checkPermission", "photo-library", "on-demand"],
    ["pickImages", null, 12_000],
  ]);
});

test("app native core stops media action when required permission is denied", async () => {
  const { createAppNativeCore } = await importAppNativeCore();
  const calls = [];
  const core = createAppNativeCore(
    createBridge(calls, {
      async ensurePermission(input) {
        calls.push(["ensurePermission", input.kind, input.trigger, input.purpose]);
        return {
          ok: false,
          kind: input.kind,
          status: "denied",
          requested: true,
          reason: "permission-denied",
        };
      },
    }),
  );

  assert.deepEqual(await core.pickMedia("camera"), {
    ok: false,
    action: "media.capture-camera",
    source: "camera",
    permissions: [
      {
        ok: false,
        kind: "camera",
        status: "denied",
        requested: true,
        reason: "permission-denied",
      },
    ],
    files: [],
    reason: "permission-denied",
  });
  assert.deepEqual(calls, [
    ["ensurePermission", "camera", "on-demand", "capture-image"],
  ]);
});

test("app native core supports manual permission requests", async () => {
  const { createAppNativeCore } = await importAppNativeCore();
  const calls = [];
  const core = createAppNativeCore(createBridge(calls));

  assert.deepEqual(await core.requestPermission("notification"), {
    ok: true,
    kind: "notification",
    status: "granted",
    requested: true,
  });
  assert.deepEqual(calls, [
    ["requestPermission", "notification", "manual", "device-service"],
  ]);
});

test("app native core can override update check current version", async () => {
  const { createAppNativeCore } = await importAppNativeCore();
  const calls = [];
  const originalFetch = globalThis.fetch;
  const core = createAppNativeCore(createBridge(calls));

  globalThis.fetch = async (url) => {
    calls.push(["fetch", String(url)]);
    return {
      ok: true,
      async json() {
        return {
          updateAvailable: true,
          version: "testing-a1b2c3d",
          shellVersion: "0.1.0",
          downloadUrl: "https://downloads.example.test/app.apk",
        };
      },
    };
  };

  try {
    assert.equal(
      (await core.checkAppUpdate({ currentVersion: "0.0.0" }))?.updateAvailable,
      true,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(calls, [
    ["getClientInfo"],
    [
      "fetch",
      "/api/client-updates/check?client=appMobile&target=android&channel=testing&currentVersion=0.0.0",
    ],
  ]);
});
