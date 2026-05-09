import assert from "node:assert/strict";
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

  assert.deepEqual(await bridge.openExternal({ url: "javascript:alert(1)" }), {
    ok: false,
    reason: "browser-open-unavailable",
  });
  assert.equal(opened.length, 1);
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
  assert.equal((await bridge.checkUpdate()).update?.version, "0.2.0");
  assert.deepEqual(
    calls.map((call) => call.command),
    ["get_client_info", "open_external", "check_update"],
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

test("native bridge waits briefly for Android map bridge injection", async () => {
  const calls = [];
  const globalScope = {
    navigator: { userAgent: "Mozilla/5.0 (Linux; Android 15)" },
    setTimeout(callback) {
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

test("browser bridge can use Android map install bridge when available", async () => {
  const bridge = createBrowserNativeBridge({
    globalScope: {
      AndroidMap: {
        isAppInstalled: (packageName) => packageName === "com.tencent.map",
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

test("native capability core lists map candidates and skips unavailable apps", async () => {
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
      reason: "not-installed",
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
