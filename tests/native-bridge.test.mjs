import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWebMapNavigationUrl,
  createBrowserNativeBridge,
  createDetectedTauriNativeBridge,
  createNativeBridge,
  getTauriInvoke,
  hasNativeFeature,
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
