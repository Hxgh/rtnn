import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const repoRoot = path.resolve(import.meta.dirname, "..");
const nativeBridgeDistPath = path
  .join(repoRoot, "packages/native-bridge/dist/index.js")
  .replaceAll(path.sep, "/");

async function importAppNativeCore() {
  const sourcePath = path.join(repoRoot, "apps/app/lib/native-core/index.ts");
  const source = readFileSync(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const testModuleDir = path.join(repoRoot, ".tmp-tests");
  const testModulePath = path.join(testModuleDir, "app-native-core.mjs");
  const runnableSource = transpiled.replace(
    /from "@rtnn\/native-bridge"/g,
    `from "file://${nativeBridgeDistPath}"`,
  );

  mkdirSync(testModuleDir, { recursive: true });
  writeFileSync(testModulePath, runnableSource);

  return import(`file://${testModulePath}?t=${Date.now()}`);
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
      calls.push(["openMapNavigation", input.appType]);
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
  });
  assert.deepEqual(calls, [
    ["checkMapInstalled", "amap"],
    ["openMapNavigation", "amap"],
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
