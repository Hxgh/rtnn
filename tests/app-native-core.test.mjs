import assert from "node:assert/strict";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const repoRoot = path.resolve(import.meta.dirname, "..");
const nativeBridgeDistPath = path
  .join(repoRoot, "packages/native-bridge/dist/index.js")
  .replaceAll(path.sep, "/");

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
      calls.push(["scanBarcode", input?.timeoutMs ?? null]);
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
        status: "granted",
        requested: true,
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
    ["ensurePermission", "photo-library", "on-demand", "pick-image"],
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
    permissions: [
      {
        ok: true,
        kind: "camera",
        status: "granted",
        requested: true,
      },
    ],
    codes: [
      {
        rawValue: "rtnn-test",
        format: "qr_code",
      },
    ],
  });
  assert.deepEqual(await core.showTestNotification(), {
    ok: true,
    message: "notification-dispatched",
  });
  assert.deepEqual(calls, [
    ["ensurePermission", "camera", "on-demand", "scan-barcode"],
    ["scanBarcode", 1234],
    ["ensurePermission", "notification", "on-demand", "enable-notification"],
    ["showNotification", "RTNN"],
  ]);
});

test("app native core keeps manually selected map apps actionable after uncertain detection", async () => {
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
    true,
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
      ok: true,
      message: "opened-native-map",
      appType: "amap",
    },
  );
  assert.deepEqual(calls, [
    ["checkMapInstalled", "amap"],
    ["checkMapInstalled", "baidu"],
    ["checkMapInstalled", "tencent"],
    ["checkMapInstalled", "amap"],
    ["openMapNavigation", "amap", false],
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
        status: "granted",
        requested: true,
      },
    ],
    files: [],
    reason: "file-picker-cancelled",
  });
  assert.deepEqual(calls, [
    ["ensurePermission", "photo-library", "on-demand", "pick-image"],
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

test("app native core keeps manual permission requests in diagnostics only", async () => {
  const { createAppNativeCore } = await importAppNativeCore();
  const calls = [];
  const core = createAppNativeCore(createBridge(calls));

  assert.deepEqual(await core.requestPermissionForDiagnostics("notification"), {
    ok: true,
    kind: "notification",
    status: "granted",
    requested: true,
  });
  assert.deepEqual(calls, [
    ["ensurePermission", "notification", "manual", "native-diagnostics"],
  ]);
});

test("app native core can override update check current version for diagnostics", async () => {
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
