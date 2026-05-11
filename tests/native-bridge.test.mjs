import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  buildWebMapNavigationUrl,
  createBrowserNativeBridge,
  createDetectedTauriNativeBridge,
  createNativeCapabilityCore,
  createNativeBridge,
  getTauriInvoke,
  hasNativeFeature,
  installNativeViewportInsets,
  resolveNativeClientUpdateQuery,
} from "../packages/native-bridge/dist/index.js";

const repoRoot = path.resolve(import.meta.dirname, "..");

test("browser bridge reports browser client info and opens only http URLs", async () => {
  const opened = [];
  const bridge = createBrowserNativeBridge({
    channel: "testing",
    sourceSha: "abc123",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    open: (url, target, features) => {
      opened.push({ url, target, features });
    },
  });

  assert.deepEqual(await bridge.getClientInfo(), {
    runtime: "browser",
    shell: null,
    platform: "ios",
    appVersion: null,
    bridgeVersion: "0.1.0",
    channel: "testing",
    sourceSha: "abc123",
    features: [],
  });

  assert.deepEqual(await bridge.openExternal({ url: "https://example.com/file.apk" }), {
    ok: true,
  });
  assert.equal(opened[0].target, "_blank");
  assert.equal(opened[0].features, "noopener,noreferrer");

  assert.deepEqual(await bridge.openInAppWebView({ url: "https://example.com/download" }), {
    ok: true,
    message: "opened-in-app-webview",
  });
  assert.equal(opened[1].target, "_self");

  assert.deepEqual(await bridge.openExternal({ url: "javascript:alert(1)" }), {
    ok: false,
    reason: "browser-open-unavailable",
  });
  assert.equal(opened.length, 2);
});

test("browser map navigation builds AMap URL from coordinates", () => {
  assert.equal(
    buildWebMapNavigationUrl({
      lat: 30.25,
      lng: 120.16,
      name: "杭州",
    }),
    "https://uri.amap.com/navigation?to=120.16,30.25,%E6%9D%AD%E5%B7%9E&mode=car",
  );

  assert.equal(buildWebMapNavigationUrl({}), null);
});

test("browser map navigation supports common China map web fallbacks", () => {
  assert.equal(
    buildWebMapNavigationUrl({
      appType: "baidu",
      lat: 30.25,
      lng: 120.16,
      name: "杭州",
    }),
    "https://api.map.baidu.com/direction?destination=latlng:30.25,120.16|name:%E6%9D%AD%E5%B7%9E&mode=driving&output=html&coord_type=gcj02",
  );

  assert.equal(
    buildWebMapNavigationUrl({
      appType: "tencent",
      lat: 30.25,
      lng: 120.16,
      name: "杭州",
    }),
    "https://apis.map.qq.com/uri/v1/routeplan?type=drive&tocoord=30.25,120.16&to=%E6%9D%AD%E5%B7%9E",
  );
});

test("native bridge detects Tauri invoke from global scope", () => {
  const invoke = async () => ({ ok: true });

  assert.equal(getTauriInvoke({ __TAURI__: { core: { invoke } } }), invoke);
  assert.equal(getTauriInvoke({ __TAURI__: { invoke } }), invoke);
  assert.equal(getTauriInvoke({ __TAURI_INTERNALS__: { invoke } }), invoke);
  assert.equal(getTauriInvoke({}), null);
});

test("detected Tauri bridge reads native client info and commands", async () => {
  const calls = [];
  const invoke = async (command, args) => {
    calls.push({ command, args });

    if (command === "get_client_info") {
      return {
        runtime: "tauri",
        shell: "admin-desktop",
        platform: "macos",
        appVersion: "0.1.0",
        bridgeVersion: "0.1.0",
        channel: "testing",
        features: ["external.open", "updater"],
      };
    }

    if (command === "check_update") {
      return {
        ok: true,
        update: {
          available: true,
          version: "0.2.0",
          currentVersion: "0.1.0",
        },
      };
    }

    return { ok: true };
  };

  const bridge = createDetectedTauriNativeBridge({ invoke });
  const info = await bridge.getClientInfo();

  assert.equal(info.runtime, "tauri");
  assert.equal(info.shell, "admin-desktop");
  assert.equal(hasNativeFeature(info, "updater"), true);
  assert.deepEqual(await bridge.openExternal({ url: "https://example.com" }), {
    ok: true,
  });
  assert.deepEqual(await bridge.openInAppWebView({ url: "https://example.com/download" }), {
    ok: true,
  });
  assert.equal((await bridge.checkUpdate()).update?.version, "0.2.0");
  assert.deepEqual(
    calls.map((call) => call.command),
    ["get_client_info", "open_external", "open_in_app_webview", "check_update"],
  );
});

test("detected Tauri bridge uses native permission and map install commands", async () => {
  const calls = [];
  const invoke = async (command, args) => {
    calls.push({ command, args });

    if (command === "check_permission") {
      return {
        ok: true,
        kind: args.kind,
        status: "prompt",
        requested: false,
        canAskAgain: true,
      };
    }

    if (command === "request_permission") {
      return {
        ok: true,
        kind: args.kind,
        status: "granted",
        requested: true,
      };
    }

    if (command === "check_map_installed") {
      return {
        ok: true,
        appType: args.appType,
        installed: true,
        status: "installed",
      };
    }

    return { ok: true };
  };

  const bridge = createDetectedTauriNativeBridge({ invoke });

  assert.equal((await bridge.checkPermission("camera")).status, "prompt");
  assert.equal(
    (
      await bridge.requestPermission({
        kind: "camera",
        trigger: "on-demand",
        purpose: "capture-image",
      })
    ).status,
    "granted",
  );
  assert.deepEqual(await bridge.checkMapInstalled({ appType: "amap" }), {
    ok: true,
    appType: "amap",
    installed: true,
    status: "installed",
    message: undefined,
    reason: undefined,
    diagnostic: undefined,
  });
  assert.deepEqual(
    calls.map((call) => call.command),
    ["check_permission", "request_permission", "check_map_installed"],
  );
});

test("native bridge detects Android map apps through WebView bridge first", async () => {
  const calls = [];
  const globalScope = {
    AndroidMap: {
      isAppInstalled(packageName) {
        calls.push(["AndroidMap.isAppInstalled", packageName]);
        return packageName === "com.autonavi.minimap";
      },
    },
  };
  const invoke = async (command) => {
    calls.push(["invoke", command]);
    return {
      ok: true,
      appType: "amap",
      installed: null,
      status: "unknown",
    };
  };
  const bridge = createDetectedTauriNativeBridge({ invoke, globalScope });

  assert.deepEqual(await bridge.checkMapInstalled({ appType: "amap" }), {
    ok: true,
    appType: "amap",
    installed: true,
    status: "installed",
    reason: undefined,
  });
  assert.deepEqual(await bridge.checkMapInstalled({ appType: "baidu" }), {
    ok: false,
    appType: "baidu",
    installed: false,
    status: "not-installed",
    reason: "map-app-not-installed",
  });
  assert.deepEqual(calls, [
    ["AndroidMap.isAppInstalled", "com.autonavi.minimap"],
    ["AndroidMap.isAppInstalled", "com.baidu.BaiduMap"],
  ]);
});

test("native bridge preserves Android map detail fields", async () => {
  const bridge = createDetectedTauriNativeBridge({
    globalScope: {},
    invoke: async () => ({
      ok: false,
      appType: "amap",
      installed: false,
      status: "not-installed",
      reason: "map-app-not-installed-or-not-visible",
      diagnostic: "com.autonavi.minimap:launch=false,package=false",
    }),
  });

  assert.deepEqual(await bridge.checkMapInstalled({ appType: "amap" }), {
    ok: false,
    appType: "amap",
    installed: false,
    status: "not-installed",
    message: undefined,
    reason: "map-app-not-installed-or-not-visible",
    diagnostic: "com.autonavi.minimap:launch=false,package=false",
  });
});

test("native capability core disables Android package visibility candidates", async () => {
  const bridge = createDetectedTauriNativeBridge({
    globalScope: {},
    invoke: async () => ({
      ok: false,
      appType: "amap",
      installed: false,
      status: "not-installed",
      reason: "map-app-not-installed-or-not-visible",
      diagnostic: "com.autonavi.minimap:launch=false,package=false",
    }),
  });
  const core = createNativeCapabilityCore({ bridge });
  const candidates = await core.listMapOpenCandidates();

  assert.equal(candidates.find((item) => item.appType === "amap")?.available, false);
});

test("native capability core skips clearly missing maps during automatic open", async () => {
  const calls = [];
  const bridge = createDetectedTauriNativeBridge({
    globalScope: {},
    invoke: async (command, args) => {
      calls.push([command, args?.appType]);

      if (command === "check_map_installed") {
        return {
          ok: false,
          appType: args.appType,
          installed: false,
          status: "not-installed",
          reason: "map-app-not-installed",
        };
      }

      return { ok: true };
    },
  });
  const core = createNativeCapabilityCore({ bridge });

  assert.deepEqual(
    await core.openPreferredMapNavigation({
      lat: 30.25,
      lng: 120.16,
    }),
    {
      ok: false,
      reason: "map-app-not-installed",
    },
  );
  assert.deepEqual(calls, [
    ["check_map_installed", "amap"],
    ["check_map_installed", "baidu"],
    ["check_map_installed", "tencent"],
  ]);
});

test("native capability core blocks unavailable manually selected Android maps", async () => {
  const calls = [];
  const bridge = createDetectedTauriNativeBridge({
    globalScope: {},
    invoke: async (command, args) => {
      calls.push([command, args?.appType]);

      if (command === "check_map_installed") {
        return {
          ok: true,
          appType: args.appType,
          installed: null,
          status: "unknown",
          reason: "map-install-check-unavailable",
        };
      }

      return { ok: true, message: "opened-native-map" };
    },
  });
  const core = createNativeCapabilityCore({ bridge });
  const candidates = await core.listMapOpenCandidates();

  assert.equal(candidates.find((item) => item.appType === "amap")?.available, false);
  assert.deepEqual(
    await core.openPreferredMapNavigation({
      lat: 30.25,
      lng: 120.16,
      appType: "amap",
    }),
    {
      ok: false,
      reason: "map-install-check-unavailable",
    },
  );
  assert.deepEqual(calls, [
    ["check_map_installed", "amap"],
    ["check_map_installed", "baidu"],
    ["check_map_installed", "tencent"],
    ["check_map_installed", "amap"],
  ]);
});

test("native bridge parses structured Android map install details", async () => {
  const calls = [];
  const bridge = createDetectedTauriNativeBridge({
    globalScope: {
      AndroidMap: {
        checkAppInstalled(packageName) {
          calls.push(["AndroidMap.checkAppInstalled", packageName]);
          return JSON.stringify({
            ok: true,
            installed: true,
            status: "installed",
            message: "installed-by-launch-intent",
          });
        },
      },
    },
    invoke: async (command) => {
      calls.push(["invoke", command]);
      return {
        ok: true,
        appType: "amap",
        installed: null,
        status: "unknown",
      };
    },
  });

  assert.deepEqual(await bridge.checkMapInstalled({ appType: "amap" }), {
    ok: true,
    appType: "amap",
    installed: true,
    status: "installed",
    message: "installed-by-launch-intent",
    reason: undefined,
    diagnostic: undefined,
  });
  assert.deepEqual(calls, [
    ["AndroidMap.checkAppInstalled", "com.autonavi.minimap"],
  ]);
});

test("native bridge waits briefly for Android map bridge injection", async () => {
  const calls = [];
  const delays = [];
  const globalScope = {
    navigator: { userAgent: "Mozilla/5.0 (Linux; Android 15)" },
    setTimeout(callback, delay) {
      delays.push(delay);
      globalScope.AndroidMap = {
        isAppInstalled(packageName) {
          calls.push(["AndroidMap.isAppInstalled", packageName]);
          return packageName === "com.tencent.map";
        },
      };
      callback();
      return 1;
    },
    AndroidMap: undefined,
  };
  const bridge = createDetectedTauriNativeBridge({
    globalScope,
    invoke: async (command) => {
      calls.push(["invoke", command]);
      return {
        ok: true,
        appType: "tencent",
        installed: null,
        status: "unknown",
      };
    },
  });

  assert.deepEqual(await bridge.checkMapInstalled({ appType: "tencent" }), {
    ok: true,
    appType: "tencent",
    installed: true,
    status: "installed",
    reason: undefined,
  });
  assert.deepEqual(calls, [
    ["AndroidMap.isAppInstalled", "com.tencent.map"],
  ]);
  assert.deepEqual(delays, [100]);
});

test("native bridge can be woken by Android map ready event", async () => {
  const calls = [];
  const listeners = new Map();
  const globalScope = {
    navigator: { userAgent: "Mozilla/5.0 (Linux; Android 15)" },
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    removeEventListener(name) {
      listeners.delete(name);
    },
    setTimeout() {
      return 1;
    },
    clearTimeout() {},
    AndroidMap: undefined,
  };
  const bridge = createDetectedTauriNativeBridge({
    globalScope,
    invoke: async (command) => {
      calls.push(["invoke", command]);
      return {
        ok: true,
        appType: "amap",
        installed: null,
        status: "unknown",
      };
    },
  });
  const pending = bridge.checkMapInstalled({ appType: "amap" });

  assert.equal(listeners.has("rtnn:android-map-ready"), true);
  globalScope.AndroidMap = {
    isAppInstalled(packageName) {
      calls.push(["AndroidMap.isAppInstalled", packageName]);
      return packageName === "com.autonavi.minimap";
    },
  };
  listeners.get("rtnn:android-map-ready")();

  assert.deepEqual(await pending, {
    ok: true,
    appType: "amap",
    installed: true,
    status: "installed",
    reason: undefined,
  });
  assert.equal(listeners.has("rtnn:android-map-ready"), false);
  assert.deepEqual(calls, [
    ["AndroidMap.isAppInstalled", "com.autonavi.minimap"],
  ]);
});

test("native bridge retries Android map check when bridge object is not injected yet", async () => {
  const calls = [];
  const listeners = new Map();
  const timers = [];
  const globalScope = {
    navigator: { userAgent: "Mozilla/5.0 (Linux; Android 15)" },
    AndroidMap: {
      checkAppInstalled() {
        calls.push(["AndroidMap.checkAppInstalled", "not-ready"]);
        throw new Error("Java bridge method can't be invoked on a non-injected object");
      },
    },
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    removeEventListener(name) {
      listeners.delete(name);
    },
    setTimeout(callback, delay) {
      timers.push([callback, delay]);
      return 1;
    },
    clearTimeout() {},
  };
  const bridge = createDetectedTauriNativeBridge({
    globalScope,
    invoke: async (command) => {
      calls.push(["invoke", command]);
      return {
        ok: false,
        appType: "amap",
        installed: false,
        status: "not-installed",
      };
    },
  });
  const pending = bridge.checkMapInstalled({ appType: "amap" });

  assert.equal(listeners.has("rtnn:android-map-ready"), true);
  globalScope.AndroidMap = {
    checkAppInstalled(packageName) {
      calls.push(["AndroidMap.checkAppInstalled", packageName]);
      return JSON.stringify({
        ok: true,
        installed: true,
        status: "installed",
      });
    },
  };
  listeners.get("rtnn:android-map-ready")();

  assert.deepEqual(await pending, {
    ok: true,
    appType: "amap",
    installed: true,
    status: "installed",
    message: undefined,
    reason: undefined,
    diagnostic: undefined,
  });
  assert.equal(timers[0][1], 100);
  assert.deepEqual(calls, [
    ["AndroidMap.checkAppInstalled", "not-ready"],
    ["AndroidMap.checkAppInstalled", "com.autonavi.minimap"],
  ]);
});

test("browser bridge can use Android map install bridge when available", async () => {
  const calls = [];
  const bridge = createBrowserNativeBridge({
    globalScope: {
      AndroidMap: {
        isAppInstalled(packageName) {
          calls.push(packageName);
          return packageName === "com.tencent.maplite";
        },
      },
    },
  });

  assert.deepEqual(await bridge.checkMapInstalled({ appType: "tencent" }), {
    ok: true,
    appType: "tencent",
    installed: true,
    status: "installed",
    reason: undefined,
  });
  assert.deepEqual(calls, ["com.tencent.map", "com.tencent.maplite"]);
});

test("browser bridge opens Android map through injected WebView bridge first", async () => {
  const calls = [];
  const bridge = createBrowserNativeBridge({
    globalScope: {
      navigator: { userAgent: "Mozilla/5.0 (Linux; Android 15)" },
      AndroidMap: {
        openNavigation(appType, url) {
          calls.push(["AndroidMap.openNavigation", appType, url]);
          return JSON.stringify({
            ok: true,
            message: "opened-native-map",
          });
        },
      },
      location: {
        assign(url) {
          calls.push(["location.assign", url]);
        },
        href: "",
      },
    },
  });

  assert.deepEqual(
    await bridge.openMapNavigation({
      appType: "amap",
      lat: 30.25,
      lng: 120.16,
      name: "杭州",
      allowWebFallback: false,
    }),
    {
      ok: true,
      message: "opened-native-map",
    },
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "AndroidMap.openNavigation");
  assert.equal(calls[0][1], "amap");
  assert.match(calls[0][2], /^androidamap:\/\//);
});

test("browser bridge does not dispatch Android map scheme when injected open reports no handler", async () => {
  const calls = [];
  const bridge = createBrowserNativeBridge({
    globalScope: {
      navigator: { userAgent: "Mozilla/5.0 (Linux; Android 15)" },
      AndroidMap: {
        openNavigation(appType, url) {
          calls.push(["AndroidMap.openNavigation", appType, url]);
          return JSON.stringify({
            ok: false,
            reason: "native-map-no-handler",
          });
        },
      },
      location: {
        assign(url) {
          calls.push(["location.assign", url]);
        },
        href: "",
      },
    },
  });

  assert.deepEqual(
    await bridge.openMapNavigation({
      appType: "amap",
      lat: 30.25,
      lng: 120.16,
      name: "杭州",
      allowWebFallback: false,
    }),
    {
      ok: false,
      reason: "native-map-no-handler",
    },
  );
  assert.deepEqual(calls.map((call) => call[0]), ["AndroidMap.openNavigation"]);
});

test("browser bridge does not assign Android map scheme without injected native opener", async () => {
  const calls = [];
  const bridge = createBrowserNativeBridge({
    globalScope: {
      navigator: { userAgent: "Mozilla/5.0 (Linux; Android 15)" },
      location: {
        assign(url) {
          calls.push(["location.assign", url]);
        },
        href: "",
      },
    },
  });

  assert.deepEqual(
    await bridge.openMapNavigation({
      appType: "amap",
      lat: 30.25,
      lng: 120.16,
      name: "杭州",
      allowWebFallback: false,
    }),
    {
      ok: false,
      reason: "native-map-open-unavailable",
    },
  );
  assert.deepEqual(calls, []);
});

test("detected Tauri bridge returns Android map bridge failure when web fallback is disabled", async () => {
  const calls = [];
  const bridge = createDetectedTauriNativeBridge({
    globalScope: {
      navigator: { userAgent: "Mozilla/5.0 (Linux; Android 15)" },
      AndroidMap: {
        openNavigation(appType, url) {
          calls.push(["AndroidMap.openNavigation", appType, url]);
          return JSON.stringify({
            ok: false,
            reason: "native-map-open-failed",
          });
        },
      },
      location: {
        assign(url) {
          calls.push(["location.assign", url]);
        },
        href: "",
      },
    },
    invoke: async (command) => {
      calls.push(["invoke", command]);
      return { ok: true };
    },
  });

  assert.deepEqual(
    await bridge.openMapNavigation({
      appType: "baidu",
      name: "杭州",
      allowWebFallback: false,
    }),
    {
      ok: false,
      reason: "native-map-open-failed",
    },
  );
  assert.deepEqual(calls.map((call) => call[0]), ["AndroidMap.openNavigation"]);
});

test("createNativeBridge falls back to browser without Tauri", async () => {
  const bridge = createNativeBridge({
    globalScope: {},
    open: () => {},
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)",
  });

  const info = await bridge.getClientInfo();

  assert.equal(info.runtime, "browser");
  assert.equal(info.platform, "macos");
});

test("createNativeBridge uses detected Tauri invoke when available", async () => {
  const bridge = createNativeBridge({
    globalScope: {
      __TAURI__: {
        core: {
          invoke: async (command) => {
            assert.equal(command, "get_client_info");
            return {
              runtime: "tauri",
              shell: "app-mobile",
              platform: "android",
              appVersion: "0.1.0",
              bridgeVersion: "0.1.0",
              channel: "production",
              features: ["external.open", "map.navigation"],
            };
          },
        },
      },
    },
  });

  assert.equal((await bridge.getClientInfo()).shell, "app-mobile");
});

test("browser bridge reports unavailable image picker without document", async () => {
  const bridge = createBrowserNativeBridge();

  assert.deepEqual(await bridge.pickImages(), {
    ok: false,
    reason: "file-picker-unavailable",
    files: [],
  });
});

test("browser bridge exposes a unified permission contract", async () => {
  let requested = false;
  const bridge = createBrowserNativeBridge({
    globalScope: {
      Notification: {
        permission: "default",
        requestPermission: async () => {
          requested = true;
          return "granted";
        },
      },
    },
  });

  assert.deepEqual(await bridge.checkPermission("photo-library"), {
    ok: true,
    kind: "photo-library",
    status: "prompt",
    requested: false,
    canAskAgain: true,
    message: undefined,
    reason: "permission-managed-by-file-picker",
  });

  assert.equal((await bridge.checkPermission("notification")).status, "prompt");
  assert.equal((await bridge.requestPermission("notification")).status, "granted");
  assert.equal(requested, true);
});

test("browser bridge requests standalone camera through media devices", async () => {
  let openedCamera = false;
  const bridge = createBrowserNativeBridge({
    globalScope: {
      navigator: {
        mediaDevices: {
          async getUserMedia(constraints) {
            openedCamera = constraints.video === true;
            return {
              getTracks() {
                return [
                  {
                    stop() {
                      openedCamera = openedCamera && true;
                    },
                  },
                ];
              },
            };
          },
        },
      },
    },
  });

  assert.deepEqual(
    await bridge.requestPermission({
      kind: "camera",
      trigger: "on-demand",
      purpose: "scan-barcode",
    }),
    {
      ok: true,
      kind: "camera",
      status: "granted",
      requested: true,
      canAskAgain: false,
      message: undefined,
      reason: undefined,
    },
  );
  assert.equal(openedCamera, true);
});

test("browser bridge prefers Android media bridge over web file input", async () => {
  const calls = [];
  const bridge = createBrowserNativeBridge({
    globalScope: {
      AndroidMedia: {
        pickImages(optionsJson) {
          calls.push(["AndroidMedia.pickImages", JSON.parse(optionsJson)]);
          return JSON.stringify({
            ok: true,
            files: [
              {
                name: "native.jpg",
                type: "image/jpeg",
                size: 2048,
                dataUrl: "data:image/jpeg;base64,AA==",
              },
            ],
          });
        },
      },
    },
  });

  assert.deepEqual(await bridge.pickImages({ maxFiles: 1 }), {
    ok: true,
    message: undefined,
    reason: undefined,
    dispatched: undefined,
    files: [
      {
        name: "native.jpg",
        type: "image/jpeg",
        size: 2048,
        dataUrl: "data:image/jpeg;base64,AA==",
      },
    ],
  });
  assert.deepEqual(calls, [["AndroidMedia.pickImages", { maxFiles: 1 }]]);
});

test("detected Tauri bridge prefers barcode plugin for camera scan", async () => {
  const calls = [];
  const bridge = createDetectedTauriNativeBridge({
    globalScope: {
      AndroidBarcode: {
        scanBarcode() {
          calls.push(["AndroidBarcode.scanBarcode"]);
          return JSON.stringify({ ok: true, codes: [{ rawValue: "android" }] });
        },
      },
    },
    invoke: async (command) => {
      calls.push(["invoke", command]);
      if (command === "plugin:barcode-scanner|scan") {
        return {
          content: "plugin",
          format: { name: "qr_code" },
        };
      }

      return { ok: true, codes: [{ rawValue: "command" }] };
    },
  });

  assert.deepEqual(await bridge.scanBarcode(), {
    ok: true,
    reason: undefined,
    codes: [
      {
        rawValue: "plugin",
        format: "qr_code",
      },
    ],
  });
  assert.deepEqual(calls, [["invoke", "plugin:barcode-scanner|scan"]]);
});

test("detected Tauri bridge uses Android barcode bridge for image scan", async () => {
  const calls = [];
  const bridge = createDetectedTauriNativeBridge({
    globalScope: {
      AndroidBarcode: {
        scanBarcode(optionsJson) {
          calls.push(["AndroidBarcode.scanBarcode", JSON.parse(optionsJson)]);
          return JSON.stringify({
            ok: true,
            codes: [{ rawValue: "android", format: "qr_code" }],
          });
        },
      },
    },
    invoke: async (command) => {
      calls.push(["invoke", command]);
      return { ok: true, codes: [{ rawValue: "command" }] };
    },
  });

  assert.deepEqual(await bridge.scanBarcode({ source: "image", timeoutMs: 2000 }), {
    ok: true,
    message: undefined,
    reason: undefined,
    dispatched: undefined,
    codes: [
      {
        rawValue: "android",
        format: "qr_code",
      },
    ],
    files: undefined,
  });
  assert.deepEqual(calls, [
    ["AndroidBarcode.scanBarcode", { source: "image", timeoutMs: 2000 }],
  ]);
});

test("detected Tauri bridge falls back to Android barcode bridge when plugin is unavailable", async () => {
  const calls = [];
  const bridge = createDetectedTauriNativeBridge({
    globalScope: {
      AndroidBarcode: {
        scanBarcode(optionsJson) {
          calls.push(["AndroidBarcode.scanBarcode", JSON.parse(optionsJson)]);
          return JSON.stringify({
            ok: true,
            codes: [{ rawValue: "android", format: "qr_code" }],
          });
        },
      },
    },
    invoke: async (command) => {
      calls.push(["invoke", command]);
      if (command === "plugin:barcode-scanner|scan") {
        throw new Error("plugin:barcode-scanner not initialized");
      }

      return { ok: true, codes: [{ rawValue: "command" }] };
    },
  });

  assert.deepEqual(await bridge.scanBarcode({ source: "camera", timeoutMs: 2000 }), {
    ok: true,
    message: undefined,
    reason: undefined,
    dispatched: undefined,
    codes: [
      {
        rawValue: "android",
        format: "qr_code",
      },
    ],
    files: undefined,
  });
  assert.deepEqual(calls, [
    ["invoke", "plugin:barcode-scanner|scan"],
    ["AndroidBarcode.scanBarcode", { source: "camera", timeoutMs: 2000 }],
  ]);
});

test("detected Tauri bridge uses barcode plugin when Android barcode bridge is missing", async () => {
  const calls = [];
  const bridge = createDetectedTauriNativeBridge({
    globalScope: {},
    invoke: async (command) => {
      calls.push(["invoke", command]);
      if (command === "plugin:barcode-scanner|scan") {
        return {
          content: "plugin",
          format: { name: "qr_code" },
        };
      }

      return { ok: true, codes: [{ rawValue: "command" }] };
    },
  });

  assert.deepEqual(await bridge.scanBarcode(), {
    ok: true,
    reason: undefined,
    codes: [
      {
        rawValue: "plugin",
        format: "qr_code",
      },
    ],
  });
  assert.deepEqual(calls, [["invoke", "plugin:barcode-scanner|scan"]]);
});

test("image barcode scan skips camera plugin and uses Android image source directly", async () => {
  const calls = [];
  const bridge = createDetectedTauriNativeBridge({
    globalScope: {
      AndroidBarcode: {
        scanBarcode(optionsJson) {
          calls.push(["AndroidBarcode.scanBarcode", JSON.parse(optionsJson)]);
          return JSON.stringify({
            ok: true,
            codes: [{ rawValue: "image", format: "qr_code" }],
          });
        },
      },
    },
    invoke: async (command) => {
      calls.push(["invoke", command]);
      return { ok: true, codes: [{ rawValue: "command" }] };
    },
  });

  assert.deepEqual(await bridge.scanBarcode({ source: "image", timeoutMs: 2000 }), {
    ok: true,
    message: undefined,
    reason: undefined,
    dispatched: undefined,
    codes: [
      {
        rawValue: "image",
        format: "qr_code",
      },
    ],
    files: undefined,
  });
  assert.deepEqual(calls, [
    ["AndroidBarcode.scanBarcode", { source: "image", timeoutMs: 2000 }],
  ]);
});

test("browser bridge waits for Android permission change after dispatched request", async () => {
  const listeners = new Map();
  const timers = [];
  const globalScope = {
    AndroidPermission: {
      requestPermission(kind) {
        assert.equal(kind, "camera");
        return JSON.stringify({
          ok: true,
          kind: "camera",
          status: "prompt",
          requested: true,
          dispatched: true,
        });
      },
    },
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    removeEventListener(name) {
      listeners.delete(name);
    },
    setTimeout(callback, delay) {
      timers.push([callback, delay]);
      return 1;
    },
    clearTimeout() {},
  };
  const bridge = createBrowserNativeBridge({ globalScope });
  const pending = bridge.requestPermission({
    kind: "camera",
    trigger: "manual",
    purpose: "device-service",
  });

  assert.equal(listeners.has("rtnn:android-permission-change"), true);
  listeners.get("rtnn:android-permission-change")(
    new CustomEvent("rtnn:android-permission-change", {
      detail: { kind: "camera", granted: true },
    }),
  );

  assert.deepEqual(await pending, {
    ok: true,
    kind: "camera",
    status: "granted",
    requested: true,
    canAskAgain: false,
    message: undefined,
    reason: undefined,
  });
  assert.equal(listeners.has("rtnn:android-permission-change"), false);
  assert.equal(timers[0][1], 30_000);
});

test("detected Tauri bridge retries Android media and barcode when bridge object is not injected yet", async () => {
  const calls = [];
  const listeners = new Map();
  const globalScope = {
    navigator: { userAgent: "Mozilla/5.0 (Linux; Android 15)" },
    AndroidMedia: {
      pickImages() {
        calls.push(["AndroidMedia.pickImages", "not-ready"]);
        throw new Error("Java bridge method can't be invoked on a non-injected object");
      },
    },
    AndroidBarcode: {
      scanBarcode() {
        calls.push(["AndroidBarcode.scanBarcode", "not-ready"]);
        throw new Error("Java bridge method can't be invoked on a non-injected object");
      },
    },
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    removeEventListener(name) {
      listeners.delete(name);
    },
    setTimeout() {
      return 1;
    },
    clearTimeout() {},
  };
  const bridge = createDetectedTauriNativeBridge({
    globalScope,
    invoke: async (command) => {
      calls.push(["invoke", command]);
      throw new Error("unknown command");
    },
  });

  const pendingImages = bridge.pickImages({ maxFiles: 1 });
  assert.equal(listeners.has("rtnn:android-native-ready"), true);
  globalScope.AndroidMedia = {
    pickImages(optionsJson) {
      calls.push(["AndroidMedia.pickImages", JSON.parse(optionsJson)]);
      return JSON.stringify({
        ok: true,
        files: [{ name: "ready.jpg", type: "image/jpeg", size: 1 }],
      });
    },
  };
  listeners.get("rtnn:android-native-ready")();

  assert.deepEqual(await pendingImages, {
    ok: true,
    message: undefined,
    reason: undefined,
    dispatched: undefined,
    files: [
      {
        name: "ready.jpg",
        type: "image/jpeg",
        size: 1,
        dataUrl: undefined,
      },
    ],
  });

  globalScope.AndroidBarcode = {
    scanBarcode() {
      calls.push(["AndroidBarcode.scanBarcode", "not-ready"]);
      throw new Error("Java bridge method can't be invoked on a non-injected object");
    },
  };
  const pendingScan = bridge.scanBarcode({ source: "image", timeoutMs: 2000 });
  await Promise.resolve();
  assert.equal(listeners.has("rtnn:android-native-ready"), true);
  globalScope.AndroidBarcode = {
    scanBarcode(optionsJson) {
      calls.push(["AndroidBarcode.scanBarcode", JSON.parse(optionsJson)]);
      return JSON.stringify({
        ok: true,
        codes: [{ rawValue: "READY", format: "QR_CODE" }],
      });
    },
  };
  listeners.get("rtnn:android-native-ready")();

  assert.deepEqual(await pendingScan, {
    ok: true,
    message: undefined,
    reason: undefined,
    dispatched: undefined,
    codes: [{ rawValue: "READY", format: "QR_CODE" }],
    files: undefined,
  });
  assert.deepEqual(calls, [
    ["AndroidMedia.pickImages", "not-ready"],
    ["AndroidMedia.pickImages", { maxFiles: 1 }],
    ["AndroidBarcode.scanBarcode", "not-ready"],
    ["AndroidBarcode.scanBarcode", { source: "image", timeoutMs: 2000 }],
  ]);
});

test("native capability core requests media permissions before image picking", async () => {
  const calls = [];
  const bridge = {
    async getClientInfo() {
      calls.push(["getClientInfo"]);
      return {
        runtime: "browser",
        shell: null,
        platform: "android",
        appVersion: null,
        bridgeVersion: "0.1.0",
        channel: "testing",
        features: [],
      };
    },
    async openExternal(input) {
      calls.push(["openExternal", input]);
      return { ok: true };
    },
    async openMapNavigation(input) {
      calls.push(["openMapNavigation", input]);
      return { ok: true };
    },
    async checkMapInstalled(input) {
      calls.push(["checkMapInstalled", input]);
      return {
        ok: true,
        appType: input.appType,
        installed: null,
        status: "unknown",
      };
    },
    async checkPermission(input) {
      calls.push(["checkPermission", input.kind ?? input]);
      return {
        ok: true,
        kind: input.kind ?? input,
        status: "granted",
      };
    },
    async requestPermission(input) {
      calls.push(["requestPermission", input.kind ?? input]);
      return {
        ok: true,
        kind: input.kind ?? input,
        status: "granted",
      };
    },
    async ensurePermission(input) {
      calls.push(["ensurePermission", input.kind ?? input, input.purpose]);
      return {
        ok: true,
        kind: input.kind ?? input,
        status: "granted",
      };
    },
    async pickImages(input) {
      calls.push(["pickImages", input?.capture ?? null]);
      return { ok: true, files: [] };
    },
    async checkUpdate() {
      calls.push(["checkUpdate"]);
      return { ok: false, update: { available: false } };
    },
    async installUpdate() {
      calls.push(["installUpdate"]);
      return { ok: false };
    },
  };
  const core = createNativeCapabilityCore({ bridge });

  assert.deepEqual(core.listMapApps().map((item) => item.appType), [
    "amap",
    "baidu",
    "tencent",
  ]);
  assert.deepEqual(await core.pickImages(), {
    ok: true,
    files: [],
  });
  assert.deepEqual(await core.pickImages({ capture: "environment" }), {
    ok: true,
    files: [],
  });
  assert.deepEqual(calls, [
    ["ensurePermission", "photo-library", "pick-image"],
    ["pickImages", null],
    ["ensurePermission", "camera", "capture-image"],
    ["pickImages", "environment"],
  ]);
});

test("native capability core disables manually selected clearly missing map apps", async () => {
  const calls = [];
  const bridge = {
    async getClientInfo() {
      return {
        runtime: "browser",
        shell: null,
        platform: "android",
        appVersion: null,
        bridgeVersion: "0.1.0",
        channel: "testing",
        features: [],
      };
    },
    async openExternal() {
      return { ok: true };
    },
    async openMapNavigation(input) {
      calls.push(["openMapNavigation", input.appType]);
      return { ok: true };
    },
    async checkMapInstalled(input) {
      calls.push(["checkMapInstalled", input.appType]);
      return {
        ok: input.appType !== "baidu",
        appType: input.appType,
        installed: input.appType === "amap",
        status: input.appType === "baidu" ? "not-installed" : "installed",
        reason: input.appType === "baidu" ? "map-app-not-installed" : undefined,
      };
    },
    async checkPermission(input) {
      return {
        ok: true,
        kind: input.kind ?? input,
        status: "granted",
      };
    },
    async requestPermission(input) {
      return {
        ok: true,
        kind: input.kind ?? input,
        status: "granted",
      };
    },
    async ensurePermission(input) {
      return {
        ok: true,
        kind: input.kind ?? input,
        status: "granted",
      };
    },
    async pickImages() {
      return { ok: true, files: [] };
    },
    async checkUpdate() {
      return { ok: false, update: { available: false } };
    },
    async installUpdate() {
      return { ok: false };
    },
  };
  const core = createNativeCapabilityCore({ bridge });

  const candidates = await core.listMapOpenCandidates();
  assert.equal(candidates.find((item) => item.appType === "amap")?.available, true);
  assert.equal(candidates.find((item) => item.appType === "baidu")?.available, false);
  assert.deepEqual(
    await core.openPreferredMapNavigation({
      lat: 30.25,
      lng: 120.16,
      appType: "baidu",
    }),
    {
      ok: false,
      reason: "map-app-not-installed",
    },
  );
  assert.deepEqual(
    await core.openPreferredMapNavigation({
      lat: 30.25,
      lng: 120.16,
      appType: "amap",
    }),
    {
      ok: true,
      appType: "amap",
    },
  );
  assert.deepEqual(calls, [
    ["checkMapInstalled", "amap"],
    ["checkMapInstalled", "baidu"],
    ["checkMapInstalled", "tencent"],
    ["checkMapInstalled", "baidu"],
    ["checkMapInstalled", "amap"],
    ["openMapNavigation", "amap"],
  ]);
});

test("native capability core auto map open skips definitely unavailable apps", async () => {
  const calls = [];
  const bridge = createDetectedTauriNativeBridge({
    globalScope: {},
    invoke: async (command, args) => {
      calls.push([command, args?.appType]);

      if (command === "check_map_installed") {
        return {
          ok: args.appType === "tencent",
          appType: args.appType,
          installed: args.appType === "tencent",
          status: args.appType === "tencent" ? "installed" : "not-installed",
          reason:
            args.appType === "tencent" ? undefined : "map-app-not-installed",
        };
      }

      return { ok: true, message: "opened-native-map" };
    },
  });
  const core = createNativeCapabilityCore({ bridge });

  assert.deepEqual(
    await core.openPreferredMapNavigation({
      lat: 30.25,
      lng: 120.16,
    }),
    {
      ok: true,
      message: "opened-native-map",
      appType: "tencent",
    },
  );
  assert.deepEqual(calls, [
    ["check_map_installed", "amap"],
    ["check_map_installed", "baidu"],
    ["check_map_installed", "tencent"],
    ["open_map_navigation", "tencent"],
  ]);
});

test("native viewport insets writes keyboard CSS variables from visual viewport", () => {
  const styles = new Map();
  const root = {
    style: {
      setProperty(name, value) {
        styles.set(name, value);
      },
    },
  };
  const listeners = new Map();
  const visualViewport = {
    height: 500,
    offsetTop: 0,
    addEventListener(name, listener) {
      listeners.set(`viewport:${name}`, listener);
    },
    removeEventListener(name) {
      listeners.delete(`viewport:${name}`);
    },
  };
  const win = {
    innerHeight: 760,
    visualViewport,
    document: { documentElement: root },
    addEventListener(name, listener) {
      listeners.set(`window:${name}`, listener);
    },
    removeEventListener(name) {
      listeners.delete(`window:${name}`);
    },
  };

  const cleanup = installNativeViewportInsets({ root, window: win });

  assert.equal(styles.get("--rtnn-keyboard-height"), "260px");
  assert.equal(styles.get("--skb"), "260px");

  visualViewport.height = 750;
  listeners.get("viewport:resize")();
  assert.equal(styles.get("--rtnn-keyboard-height"), "0px");

  cleanup();
  assert.equal(listeners.size, 0);
});

test("app Android prepare script includes theme bridge and system bar sync", () => {
  const source = readFileSync(
    path.join(repoRoot, "scripts/client/prepare-app-tauri-android.mjs"),
    "utf8",
  );

  for (const snippet of [
    "webView.addJavascriptInterface(ThemeBridge(), \"AndroidTheme\")",
    "WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS",
    "WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS",
    "window.__RTNN_SYSTEM_THEME__",
    "rtnn:native-theme-change",
    "android:configChanges",
    "uiMode",
  ]) {
    assert.equal(source.includes(snippet), true, `missing ${snippet}`);
  }
});

test("native bridge resolves backend update query from Tauri client info", () => {
  assert.deepEqual(
    resolveNativeClientUpdateQuery({
      runtime: "tauri",
      shell: "admin-desktop",
      platform: "macos",
      appVersion: "0.2.0",
      bridgeVersion: "0.1.0",
      channel: "testing",
      features: ["external.open", "updater"],
    }),
    {
      client: "adminDesktop",
      target: "macos",
      channel: "testing",
      currentVersion: "0.2.0",
    },
  );

  assert.deepEqual(
    resolveNativeClientUpdateQuery({
      runtime: "tauri",
      shell: "app-mobile",
      platform: "android",
      appVersion: "0.3.0",
      bridgeVersion: "0.1.0",
      channel: "production",
      features: ["external.open", "map.navigation"],
    }),
    {
      client: "appMobile",
      target: "android",
      channel: "production",
      currentVersion: "0.3.0",
    },
  );

  assert.equal(
    resolveNativeClientUpdateQuery({
      runtime: "browser",
      shell: null,
      platform: "android",
      appVersion: null,
      bridgeVersion: "0.1.0",
      channel: "testing",
      features: [],
    }),
    null,
  );
});
