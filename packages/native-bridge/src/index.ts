export const NATIVE_BRIDGE_VERSION = "0.1.0";

export type NativeRuntime = "browser" | "tauri";
export type NativeShell = "admin-desktop" | "app-mobile";
export type NativePlatform = "macos" | "windows" | "android" | "ios" | "web";
export type NativeChannel = "dev" | "testing" | "production";
export type NativeFeature =
  | "external.open"
  | "webview.open"
  | "map.navigation"
  | "file.pick"
  | "file.save"
  | "notification"
  | "clipboard"
  | "barcode.scan"
  | "permission"
  | "safe-area"
  | "keyboard"
  | "updater";

export type NativeClientInfo = {
  runtime: NativeRuntime;
  shell: NativeShell | null;
  platform: NativePlatform;
  appVersion: string | null;
  bridgeVersion: string;
  channel: NativeChannel;
  sourceSha?: string;
  features: NativeFeature[];
};

export type NativeClientUpdateQuery = {
  client: "adminDesktop" | "appMobile";
  target: Exclude<NativePlatform, "web">;
  channel: NativeChannel;
  currentVersion?: string;
};

export type NativeBridgeActionResult = {
  ok: boolean;
  message?: string;
  reason?: string;
  dispatched?: boolean;
};

export type NativePermissionKind =
  | "camera"
  | "photo-library"
  | "notification"
  | "clipboard"
  | "location"
  | "file-picker"
  | "barcode";

export type NativePermissionStatus =
  | "granted"
  | "denied"
  | "prompt"
  | "unsupported"
  | "unknown";

export type NativePermissionTrigger = "startup" | "on-demand" | "manual";

export type NativePermissionInput = {
  kind: NativePermissionKind;
  trigger?: NativePermissionTrigger;
  purpose?: string;
};

export type NativePermissionTarget =
  | NativePermissionKind
  | NativePermissionInput;

export type NativePermissionResult = NativeBridgeActionResult & {
  kind: NativePermissionKind;
  status: NativePermissionStatus;
  requested?: boolean;
  canAskAgain?: boolean;
};

export type NativeUpdateInfo = {
  available: boolean;
  version?: string;
  currentVersion?: string;
  notes?: string;
  date?: string;
  target?: string;
};

export type NativeUpdateCheckResult = NativeBridgeActionResult & {
  update?: NativeUpdateInfo;
};

export type OpenExternalInput = {
  url: string;
  target?: "_blank" | "_self";
};

export type OpenInAppWebViewInput = {
  url: string;
};

export type MapAppType = "amap" | "baidu" | "tencent";

export type NativeMapAppInfo = {
  appType: MapAppType;
  label: string;
};

export type MapNavigationInput = {
  lat?: number;
  lng?: number;
  name?: string;
  appType?: MapAppType;
  directNav?: boolean;
  allowWebFallback?: boolean;
};

export type NativeMapInstallInput = {
  appType: MapAppType;
};

export type NativeMapInstallStatus =
  | "installed"
  | "not-installed"
  | "unknown"
  | "unsupported";

export type NativeMapInstallResult = NativeBridgeActionResult & {
  appType: MapAppType;
  installed: boolean | null;
  status: NativeMapInstallStatus;
  diagnostic?: string;
};

export type NativeImagePickInput = {
  accept?: string;
  capture?: "environment" | "user" | "camera";
  maxFiles?: number;
  multiple?: boolean;
  readAsDataUrl?: boolean;
  timeoutMs?: number;
};

export type NativePickedFile = {
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
};

export type NativeImagePickResult = NativeBridgeActionResult & {
  files: NativePickedFile[];
};

export type NativeBarcodeScanInput = {
  source?: "camera" | "image";
  formats?: string[];
  timeoutMs?: number;
};

export type NativeBarcode = {
  rawValue: string;
  format?: string;
};

export type NativeBarcodeScanResult = NativeBridgeActionResult & {
  codes: NativeBarcode[];
  files?: NativePickedFile[];
};

export type NativeNotificationInput = {
  title: string;
  body?: string;
  tag?: string;
};

export type NativeNotificationResult = NativeBridgeActionResult & {
  permission?: NativePermissionResult;
};

export type NativeMapOpenCandidate = NativeMapAppInfo &
  NativeMapInstallResult & {
    available: boolean;
  };

export type NativeBridge = {
  getClientInfo(): Promise<NativeClientInfo>;
  openExternal(input: OpenExternalInput): Promise<NativeBridgeActionResult>;
  openInAppWebView(input: OpenInAppWebViewInput): Promise<NativeBridgeActionResult>;
  openMapNavigation(
    input: MapNavigationInput,
  ): Promise<NativeBridgeActionResult>;
  checkMapInstalled(
    input: NativeMapInstallInput,
  ): Promise<NativeMapInstallResult>;
  checkPermission(
    input: NativePermissionTarget,
  ): Promise<NativePermissionResult>;
  requestPermission(
    input: NativePermissionTarget,
  ): Promise<NativePermissionResult>;
  ensurePermission(
    input: NativePermissionTarget,
  ): Promise<NativePermissionResult>;
  pickImages(input?: NativeImagePickInput): Promise<NativeImagePickResult>;
  scanBarcode(
    input?: NativeBarcodeScanInput,
  ): Promise<NativeBarcodeScanResult>;
  showNotification(
    input: NativeNotificationInput,
  ): Promise<NativeNotificationResult>;
  checkUpdate(): Promise<NativeUpdateCheckResult>;
  installUpdate(): Promise<NativeBridgeActionResult>;
};

export type NativeCapabilityCore = NativeBridge & {
  listMapApps(): NativeMapAppInfo[];
  listMapOpenCandidates(): Promise<NativeMapOpenCandidate[]>;
  openPreferredMapNavigation(
    input: Omit<MapNavigationInput, "appType"> & { appType?: MapAppType },
  ): Promise<NativeBridgeActionResult & { appType?: MapAppType }>;
};

export type TauriInvoke = <TResult = unknown>(
  command: string,
  args?: Record<string, unknown>,
) => Promise<TResult>;

type BrowserOpen = (url?: string, target?: string, features?: string) => unknown;
type BrowserPermissionState = "granted" | "denied" | "prompt";
type BrowserPermissionStatus = {
  state?: BrowserPermissionState | NativePermissionStatus;
};
type BrowserPermissionsApi = {
  query?: (descriptor: { name: string }) => Promise<BrowserPermissionStatus>;
};
type BrowserMediaStreamLike = {
  getTracks?: () => Array<{ stop?: () => void }>;
};
type BrowserMediaDevicesApi = {
  getUserMedia?: (
    constraints: Record<string, unknown>,
  ) => Promise<BrowserMediaStreamLike>;
};
type BrowserWindowLike = {
  setTimeout?: typeof setTimeout;
  clearTimeout?: typeof clearTimeout;
  addEventListener?: Window["addEventListener"];
  removeEventListener?: Window["removeEventListener"];
  dispatchEvent?: Window["dispatchEvent"];
  CustomEvent?: typeof CustomEvent;
};
type BrowserNotificationApi = {
  new (title: string, options?: { body?: string; tag?: string }): unknown;
  permission?: NotificationPermission | "default";
  requestPermission?: () =>
    | Promise<NotificationPermission | "default">
    | NotificationPermission
    | "default";
};
type BrowserBarcodeDetector = {
  detect?: (source: unknown) => Promise<Array<{ rawValue?: string; format?: string }>>;
};
type BrowserBarcodeDetectorConstructor = {
  new (options?: { formats?: string[] }): BrowserBarcodeDetector;
  getSupportedFormats?: () => Promise<string[]>;
};
type AndroidMapBridge = {
  isAppInstalled?: (packageName: string) => boolean;
  checkAppInstalled?: (packageName: string) => string | NativeMapInstallResult | boolean;
  openNavigation?: (appType: string, url: string) => string | NativeBridgeActionResult | boolean;
};
type AndroidPermissionBridge = {
  checkPermission?: (kind: string) => string | NativePermissionResult | boolean;
  requestPermission?: (
    kind: string,
    purpose?: string,
  ) => string | NativePermissionResult | boolean;
};
type AndroidNotificationBridge = {
  showNotification?: (
    title: string,
    body?: string,
    tag?: string,
  ) => string | NativeBridgeActionResult | boolean;
};
type AndroidMediaBridge = {
  pickImages?: (optionsJson?: string) => string | NativeImagePickResult | boolean;
  captureImage?: (optionsJson?: string) => string | NativeImagePickResult | boolean;
};
type AndroidBarcodeBridge = {
  scanBarcode?: (optionsJson?: string) => string | NativeBarcodeScanResult | boolean;
};
type AndroidDiagnosticsBridge = {
  getBridgeStatus?: () => string | Record<string, unknown>;
};
type AndroidThemeBridge = {
  setTheme?: (theme: string, mode: string) => void;
  getSystemTheme?: () => string;
};

type TauriGlobalScope = {
  navigator?: {
    userAgent?: string;
    permissions?: BrowserPermissionsApi;
    mediaDevices?: BrowserMediaDevicesApi;
  };
  open?: BrowserOpen;
  location?: {
    assign?: (url: string) => void;
    href?: string;
  };
  setTimeout?: typeof setTimeout;
  clearTimeout?: typeof clearTimeout;
  addEventListener?: Window["addEventListener"];
  removeEventListener?: Window["removeEventListener"];
  dispatchEvent?: Window["dispatchEvent"];
  CustomEvent?: typeof CustomEvent;
  Notification?: BrowserNotificationApi;
  BarcodeDetector?: BrowserBarcodeDetectorConstructor;
  createImageBitmap?: (source: Blob) => Promise<unknown>;
  AndroidMap?: AndroidMapBridge;
  AndroidPermission?: AndroidPermissionBridge;
  AndroidNotification?: AndroidNotificationBridge;
  AndroidMedia?: AndroidMediaBridge;
  AndroidBarcode?: AndroidBarcodeBridge;
  AndroidDiagnostics?: AndroidDiagnosticsBridge;
  AndroidTheme?: AndroidThemeBridge;
  __RTNN_SYSTEM_THEME__?: string;
  __ANDROID_SYSTEM_THEME__?: string;
  __TAURI__?: {
    core?: {
      invoke?: TauriInvoke;
    };
    invoke?: TauriInvoke;
    barcodeScanner?: {
      scan?: (options?: {
        cameraDirection?: "back" | "front";
        formats?: string[];
        windowed?: boolean;
      }) => Promise<unknown>;
    };
  };
  __TAURI_INTERNALS__?: {
    invoke?: TauriInvoke;
  };
};

export type CreateBrowserNativeBridgeOptions = Partial<
  Pick<NativeClientInfo, "channel" | "sourceSha">
> & {
  open?: BrowserOpen;
  userAgent?: string;
  globalScope?: TauriGlobalScope;
};

export type CreateTauriNativeBridgeOptions = {
  invoke: TauriInvoke;
  shell: NativeShell;
  platform: Exclude<NativePlatform, "web">;
  appVersion: string;
  channel: NativeChannel;
  sourceSha?: string;
  features?: NativeFeature[];
  openExternalCommand?: string;
  openInAppWebViewCommand?: string;
  mapNavigationCommand?: string;
  checkMapInstalledCommand?: string;
  checkPermissionCommand?: string;
  requestPermissionCommand?: string;
  scanBarcodeCommand?: string;
  showNotificationCommand?: string;
  checkUpdateCommand?: string;
  installUpdateCommand?: string;
};

export type CreateDetectedTauriNativeBridgeOptions = {
  invoke: TauriInvoke;
  fallback?: NativeBridge;
  globalScope?: TauriGlobalScope;
  getClientInfoCommand?: string;
  openExternalCommand?: string;
  openInAppWebViewCommand?: string;
  mapNavigationCommand?: string;
  checkMapInstalledCommand?: string;
  checkPermissionCommand?: string;
  requestPermissionCommand?: string;
  scanBarcodeCommand?: string;
  showNotificationCommand?: string;
  checkUpdateCommand?: string;
  installUpdateCommand?: string;
};

export type CreateNativeBridgeOptions = CreateBrowserNativeBridgeOptions & {
  globalScope?: TauriGlobalScope;
  invoke?: TauriInvoke;
  fallback?: NativeBridge;
  getClientInfoCommand?: string;
  openExternalCommand?: string;
  openInAppWebViewCommand?: string;
  mapNavigationCommand?: string;
  checkMapInstalledCommand?: string;
  checkPermissionCommand?: string;
  requestPermissionCommand?: string;
  scanBarcodeCommand?: string;
  showNotificationCommand?: string;
  checkUpdateCommand?: string;
  installUpdateCommand?: string;
};

export type CreateNativeCapabilityCoreOptions = CreateNativeBridgeOptions & {
  bridge?: NativeBridge;
};

export type NativeViewportInsetsOptions = {
  root?: HTMLElement | null;
  window?: Window | null;
  keyboardVariable?: string;
  keyboardAliasVariable?: string;
  minKeyboardHeight?: number;
};

export const NATIVE_MAP_APPS: NativeMapAppInfo[] = [
  { appType: "amap", label: "高德地图" },
  { appType: "baidu", label: "百度地图" },
  { appType: "tencent", label: "腾讯地图" },
];

const NATIVE_FILE_PICKER_CLOSED_EVENT = "rtnn:native-file-picker-closed";
const NATIVE_ANDROID_READY_EVENT = "rtnn:android-native-ready";
const NATIVE_ANDROID_MAP_READY_EVENT = "rtnn:android-map-ready";
const NATIVE_ANDROID_PERMISSION_CHANGE_EVENT = "rtnn:android-permission-change";

const NATIVE_MAP_ANDROID_PACKAGES: Record<MapAppType, string[]> = {
  amap: ["com.autonavi.minimap"],
  baidu: ["com.baidu.BaiduMap"],
  tencent: ["com.tencent.map", "com.tencent.maplite"],
};
const ANDROID_MAP_BRIDGE_WAIT_MS = 3_000;
const ANDROID_MAP_BRIDGE_POLL_MS = 100;
const ANDROID_PERMISSION_BRIDGE_WAIT_MS = 30_000;
const ANDROID_NON_INJECTED_BRIDGE_ERROR =
  "Java bridge method can't be invoked on a non-injected object";

const pickerManagedPermissionKinds = new Set<NativePermissionKind>([
  "camera",
  "photo-library",
  "file-picker",
]);

function getDefaultGlobalScope(): TauriGlobalScope | undefined {
  return typeof globalThis === "undefined"
    ? undefined
    : (globalThis as TauriGlobalScope);
}

function detectBrowserPlatform(userAgentInput?: string): NativePlatform {
  const userAgent = (
    userAgentInput ??
    getDefaultGlobalScope()?.navigator?.userAgent ??
    ""
  ).toLowerCase();

  if (!userAgent) {
    return "web";
  }

  if (userAgent.includes("android")) {
    return "android";
  }

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return "ios";
  }

  if (userAgent.includes("mac os")) {
    return "macos";
  }

  if (userAgent.includes("windows")) {
    return "windows";
  }

  return "web";
}

function openBrowserUrl(
  url: string,
  target: "_blank" | "_self" = "_blank",
  opener = getDefaultGlobalScope()?.open,
) {
  if (!isHttpUrl(url)) {
    return false;
  }

  if (typeof opener !== "function") {
    return false;
  }

  opener(url, target, "noopener,noreferrer");
  return true;
}

function openBrowserLocationUrl(
  url: string,
  globalScope: TauriGlobalScope | undefined = getDefaultGlobalScope(),
) {
  if (!isHttpUrl(url)) {
    return false;
  }

  try {
    if (typeof globalScope?.location?.assign === "function") {
      globalScope.location.assign(url);
      return true;
    }

    if (globalScope?.location && typeof globalScope.location.href === "string") {
      globalScope.location.href = url;
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function dispatchAndroidIntentUrl(
  _url: string,
  _globalScope: TauriGlobalScope | undefined = getDefaultGlobalScope(),
) {
  return false;
}

function isHttpUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function getDefaultDocument() {
  return typeof document === "undefined" ? null : document;
}

function getDefaultWindow(): BrowserWindowLike | null {
  return typeof window === "undefined" ? null : window;
}

function fileToDataUrl(file: File): Promise<string | undefined> {
  if (typeof FileReader === "undefined") {
    return Promise.resolve(undefined);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : undefined);
    };
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

async function normalizePickedFile(
  file: File,
  readAsDataUrl: boolean,
): Promise<NativePickedFile> {
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    dataUrl: readAsDataUrl ? await fileToDataUrl(file) : undefined,
  };
}

function normalizeCapture(value?: NativeImagePickInput["capture"]) {
  if (!value) {
    return "";
  }

  return value === "camera" ? "environment" : value;
}

function normalizeFilePickerClosedReason(reason: unknown) {
  if (typeof reason !== "string" || !reason.trim() || reason === "cancelled") {
    return "file-picker-cancelled";
  }

  return reason;
}

function normalizePickedFilesResult(
  result: NativeImagePickResult | null | undefined,
): NativeImagePickResult {
  if (!result || typeof result !== "object") {
    return {
      ok: false,
      reason: "file-picker-invalid-result",
      files: [],
    };
  }

  return {
    ok: Boolean(result.ok),
    message: result.message ?? undefined,
    reason: normalizeReason(result.reason),
    dispatched: result.dispatched,
    files: Array.isArray(result.files)
      ? result.files
          .filter((item) => item && typeof item.name === "string")
          .map((item) => ({
            name: item.name,
            type: typeof item.type === "string" ? item.type : "",
            size: typeof item.size === "number" ? item.size : 0,
            dataUrl: typeof item.dataUrl === "string" ? item.dataUrl : undefined,
          }))
      : [],
  };
}

function parseAndroidImagePickBridgeResult(
  value: unknown,
): NativeImagePickResult | null {
  if (typeof value === "boolean") {
    return {
      ok: value,
      reason: value ? undefined : "file-picker-failed",
      files: [],
    };
  }

  if (typeof value === "string") {
    try {
      return normalizePickedFilesResult(JSON.parse(value) as NativeImagePickResult);
    } catch {
      return {
        ok: false,
        reason: normalizeReason(value) ?? "file-picker-invalid-result",
        files: [],
      };
    }
  }

  if (value && typeof value === "object") {
    return normalizePickedFilesResult(value as NativeImagePickResult);
  }

  return null;
}

function buildAndroidJsonInput(input: unknown) {
  try {
    return JSON.stringify(input ?? {});
  } catch {
    return "{}";
  }
}

function normalizePermissionInput(
  input: NativePermissionTarget,
): NativePermissionInput {
  if (typeof input === "string") {
    return { kind: input, trigger: "manual" };
  }

  return {
    kind: input.kind,
    trigger: input.trigger ?? "manual",
    purpose: input.purpose,
  };
}

function normalizePermissionStatus(value: unknown): NativePermissionStatus {
  if (value === "default") {
    return "prompt";
  }

  if (
    value === "granted" ||
    value === "denied" ||
    value === "prompt" ||
    value === "unsupported" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function isPermissionUsable(
  kind: NativePermissionKind,
  status: NativePermissionStatus,
) {
  if (status === "granted") {
    return true;
  }

  if (status === "prompt" || status === "unknown") {
    return pickerManagedPermissionKinds.has(kind);
  }

  return false;
}

function makePermissionResult(
  input: NativePermissionInput,
  status: NativePermissionStatus,
  result: Partial<NativePermissionResult> = {},
): NativePermissionResult {
  const ok = result.ok ?? isPermissionUsable(input.kind, status);

  const normalizedResult: NativePermissionResult = {
    ok,
    kind: input.kind,
    status,
    requested: result.requested,
    canAskAgain: result.canAskAgain,
    message: result.message,
    reason: result.reason,
  };

  if (typeof result.dispatched === "boolean") {
    normalizedResult.dispatched = result.dispatched;
  }

  return normalizedResult;
}

function makePickerManagedPermissionResult(
  input: NativePermissionInput,
  requested = false,
) {
  return makePermissionResult(input, "prompt", {
    ok: true,
    requested,
    canAskAgain: true,
    reason: "permission-managed-by-file-picker",
  });
}

function normalizeAndroidPermissionKind(kind: NativePermissionKind) {
  return kind === "barcode" ? "camera" : kind;
}

function parseAndroidPermissionBridgeResult(
  value: unknown,
  input: NativePermissionInput,
): NativePermissionResult | null {
  if (typeof value === "boolean") {
    return makePermissionResult(input, value ? "granted" : "denied", {
      requested: false,
      canAskAgain: !value,
    });
  }

  if (typeof value === "string") {
    try {
      return normalizePermissionResult(
        JSON.parse(value) as NativePermissionResult,
        input,
      );
    } catch {
      return makePermissionResult(input, "unknown", {
        ok: false,
        reason: normalizeReason(value) ?? "permission-bridge-invalid-result",
      });
    }
  }

  if (value && typeof value === "object") {
    return normalizePermissionResult(
      value as NativePermissionResult,
      input,
    );
  }

  return null;
}

function checkAndroidPermissionWithBridge(
  input: NativePermissionTarget,
  globalScope: TauriGlobalScope | undefined = getDefaultGlobalScope(),
): NativePermissionResult | null {
  const normalized = normalizePermissionInput(input);
  const androidPermission = globalScope?.AndroidPermission;

  if (typeof androidPermission?.checkPermission !== "function") {
    return null;
  }

  try {
    return (
      parseAndroidPermissionBridgeResult(
        androidPermission.checkPermission(
          normalizeAndroidPermissionKind(normalized.kind),
        ),
        normalized,
      ) ?? makePermissionResult(normalized, "unknown", {
        ok: false,
        reason: "permission-bridge-invalid-result",
      })
    );
  } catch (error) {
    return makePermissionResult(normalized, "unknown", {
      ok: false,
      reason: normalizeErrorReason(error),
    });
  }
}

function requestAndroidPermissionWithBridge(
  input: NativePermissionTarget,
  globalScope: TauriGlobalScope | undefined = getDefaultGlobalScope(),
): NativePermissionResult | null {
  const normalized = normalizePermissionInput(input);
  const androidPermission = globalScope?.AndroidPermission;

  if (typeof androidPermission?.requestPermission !== "function") {
    return null;
  }

  try {
    const result = parseAndroidPermissionBridgeResult(
      androidPermission.requestPermission(
        normalizeAndroidPermissionKind(normalized.kind),
        normalized.purpose,
      ),
      normalized,
    );

    return result
      ? {
          ...result,
          requested: result.requested ?? true,
        }
      : makePermissionResult(normalized, "unknown", {
          ok: false,
          requested: true,
          reason: "permission-bridge-invalid-result",
        });
  } catch (error) {
    return makePermissionResult(normalized, "unknown", {
      ok: false,
      requested: true,
      reason: normalizeErrorReason(error),
    });
  }
}

function waitForAndroidPermissionChange(
  input: NativePermissionInput,
  dispatchedResult: NativePermissionResult,
  globalScope: TauriGlobalScope | undefined = getDefaultGlobalScope(),
): Promise<NativePermissionResult> {
  if (!dispatchedResult.dispatched || typeof globalScope?.addEventListener !== "function") {
    return Promise.resolve(dispatchedResult);
  }

  const setTimer = globalScope.setTimeout ?? setTimeout;
  const clearTimer = globalScope.clearTimeout ?? clearTimeout;

  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let completed = false;

    const finish = (result: NativePermissionResult) => {
      if (completed) {
        return;
      }

      completed = true;
      if (timer) {
        clearTimer(timer);
      }
      globalScope.removeEventListener?.(
        NATIVE_ANDROID_PERMISSION_CHANGE_EVENT,
        handlePermissionChange,
      );
      resolve(result);
    };

    const handlePermissionChange = (event: Event) => {
      const detail = (event as CustomEvent<{
        kind?: unknown;
        granted?: unknown;
      }>).detail;
      const kind = typeof detail?.kind === "string" ? detail.kind : input.kind;

      if (kind !== input.kind && !(kind === "barcode" && input.kind === "camera")) {
        return;
      }

      const granted = detail?.granted === true;
      finish(
        makePermissionResult(input, granted ? "granted" : "denied", {
          ok: granted,
          requested: true,
          canAskAgain: !granted,
          reason: granted ? undefined : "permission-denied",
        }),
      );
    };

    timer = setTimer(() => {
      finish(dispatchedResult);
    }, ANDROID_PERMISSION_BRIDGE_WAIT_MS);
    globalScope.addEventListener?.(
      NATIVE_ANDROID_PERMISSION_CHANGE_EVENT,
      handlePermissionChange,
    );
  });
}

async function queryBrowserPermission(
  kind: NativePermissionKind,
  globalScope: TauriGlobalScope | undefined = getDefaultGlobalScope(),
) {
  const permissions = globalScope?.navigator?.permissions;

  if (typeof permissions?.query !== "function") {
    return null;
  }

  const permissionNameByKind: Partial<Record<NativePermissionKind, string>> = {
    camera: "camera",
    clipboard: "clipboard-read",
    location: "geolocation",
    notification: "notifications",
  };
  const name = permissionNameByKind[kind];

  if (!name) {
    return null;
  }

  try {
    return normalizePermissionStatus(
      (await permissions.query({ name }))?.state,
    );
  } catch {
    return null;
  }
}

async function checkBrowserPermission(
  input: NativePermissionTarget,
  globalScope: TauriGlobalScope | undefined = getDefaultGlobalScope(),
): Promise<NativePermissionResult> {
  const normalized = normalizePermissionInput(input);
  const androidResult = checkAndroidPermissionWithBridge(normalized, globalScope);

  if (androidResult) {
    return androidResult;
  }

  if (pickerManagedPermissionKinds.has(normalized.kind)) {
    const queried = await queryBrowserPermission(normalized.kind, globalScope);
    return queried
      ? makePermissionResult(normalized, queried, { canAskAgain: queried === "prompt" })
      : makePickerManagedPermissionResult(normalized);
  }

  if (normalized.kind === "notification") {
    const notification = globalScope?.Notification;

    if (notification?.permission) {
      const status = normalizePermissionStatus(notification.permission);
      return makePermissionResult(normalized, status, {
        canAskAgain: status === "prompt",
      });
    }
  }

  const queried = await queryBrowserPermission(normalized.kind, globalScope);
  if (queried) {
    return makePermissionResult(normalized, queried, {
      canAskAgain: queried === "prompt",
    });
  }

  return makePermissionResult(normalized, "unsupported", {
    ok: false,
    reason: "permission-unavailable",
  });
}

async function requestBrowserPermission(
  input: NativePermissionTarget,
  globalScope: TauriGlobalScope | undefined = getDefaultGlobalScope(),
): Promise<NativePermissionResult> {
  const normalized = normalizePermissionInput(input);
  const androidResult = requestAndroidPermissionWithBridge(
    normalized,
    globalScope,
  );

  if (androidResult) {
    return waitForAndroidPermissionChange(normalized, androidResult, globalScope);
  }

  if (
    pickerManagedPermissionKinds.has(normalized.kind) &&
    normalized.purpose !== "standalone-camera"
  ) {
    if (normalized.kind !== "camera") {
      return makePickerManagedPermissionResult(normalized, true);
    }

    const hasAndroidPermissionBridge =
      typeof globalScope?.AndroidPermission?.requestPermission === "function";
    const hasCameraMediaApi =
      typeof globalScope?.navigator?.mediaDevices?.getUserMedia === "function";

    if (!hasAndroidPermissionBridge && !hasCameraMediaApi) {
      return makePickerManagedPermissionResult(normalized, true);
    }
  }

  if (normalized.kind === "notification") {
    const notification = globalScope?.Notification;

    if (typeof notification?.requestPermission === "function") {
      try {
        const status = normalizePermissionStatus(
          await notification.requestPermission(),
        );
        return makePermissionResult(normalized, status, {
          requested: true,
          canAskAgain: status === "prompt",
        });
      } catch (error) {
        return makePermissionResult(normalized, "unknown", {
          ok: false,
          requested: true,
          reason: normalizeErrorReason(error),
        });
      }
    }
  }

  if (normalized.kind === "camera") {
    const getUserMedia = globalScope?.navigator?.mediaDevices?.getUserMedia;

    if (typeof getUserMedia === "function") {
      try {
        const stream = await getUserMedia({ video: true });
        stream.getTracks?.().forEach((track) => track.stop?.());
        return makePermissionResult(normalized, "granted", {
          requested: true,
          canAskAgain: false,
        });
      } catch (error) {
        return makePermissionResult(normalized, "denied", {
          requested: true,
          canAskAgain: false,
          reason: normalizeErrorReason(error),
        });
      }
    }
  }

  const checked = await checkBrowserPermission(normalized, globalScope);
  return {
    ...checked,
    requested: true,
  };
}

async function ensureBrowserPermission(
  input: NativePermissionTarget,
  globalScope: TauriGlobalScope | undefined = getDefaultGlobalScope(),
) {
  const normalized = normalizePermissionInput(input);
  const checked = await checkBrowserPermission(normalized, globalScope);

  if (checked.status === "granted") {
    return checked;
  }

  if (checked.status === "denied" || checked.status === "unsupported") {
    return checked;
  }

  return requestBrowserPermission(
    {
      ...normalized,
      trigger: normalized.trigger ?? "on-demand",
    },
    globalScope,
  );
}

function normalizeBarcodeScanResult(
  result: NativeBarcodeScanResult | null | undefined,
): NativeBarcodeScanResult {
  if (!result || typeof result !== "object") {
    return {
      ok: false,
      reason: "barcode-scan-invalid-result",
      codes: [],
    };
  }

  return {
    ok: Boolean(result.ok),
    message: result.message ?? undefined,
    reason: normalizeReason(result.reason),
    dispatched: result.dispatched,
    codes: Array.isArray(result.codes)
      ? result.codes
          .filter((item) => item && typeof item.rawValue === "string")
          .map((item) => ({
            rawValue: item.rawValue,
            format: item.format,
          }))
      : [],
    files: Array.isArray(result.files) ? result.files : undefined,
  };
}

function parseAndroidBarcodeBridgeResult(
  value: unknown,
): NativeBarcodeScanResult | null {
  if (typeof value === "boolean") {
    return {
      ok: value,
      reason: value ? undefined : "barcode-scan-failed",
      codes: [],
    };
  }

  if (typeof value === "string") {
    try {
      return normalizeBarcodeScanResult(
        JSON.parse(value) as NativeBarcodeScanResult,
      );
    } catch {
      return {
        ok: false,
        reason: normalizeReason(value) ?? "barcode-scan-invalid-result",
        codes: [],
      };
    }
  }

  if (value && typeof value === "object") {
    return normalizeBarcodeScanResult(value as NativeBarcodeScanResult);
  }

  return null;
}

function normalizeBarcodeFormat(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && "name" in value) {
    const name = (value as { name?: unknown }).name;
    return typeof name === "string" ? name : undefined;
  }

  return undefined;
}

function normalizeTauriBarcodePluginResult(value: unknown): NativeBarcodeScanResult {
  if (!value || typeof value !== "object") {
    return {
      ok: false,
      reason: "barcode-scan-invalid-result",
      codes: [],
    };
  }

  const result = value as {
    content?: unknown;
    rawValue?: unknown;
    format?: unknown;
  };
  const rawValue =
    typeof result.content === "string"
      ? result.content
      : typeof result.rawValue === "string"
        ? result.rawValue
        : "";

  return {
    ok: Boolean(rawValue),
    reason: rawValue ? undefined : "barcode-not-found",
    codes: rawValue
      ? [
          {
            rawValue,
            format: normalizeBarcodeFormat(result.format),
          },
        ]
      : [],
  };
}

function isTauriBarcodePluginUnavailable(reason: string) {
  const normalized = reason.toLowerCase();
  return (
    normalized.includes("not found") ||
    normalized.includes("unknown command") ||
    normalized.includes("plugin not initialized") ||
    normalized.includes("plugin:barcode-scanner")
  );
}

const tauriBarcodeFormatsByInput: Record<string, string> = {
  qr_code: "QR_CODE",
  qrcode: "QR_CODE",
  qr: "QR_CODE",
  aztec: "AZTEC",
  codabar: "CODABAR",
  code_39: "CODE_39",
  code39: "CODE_39",
  code_93: "CODE_93",
  code93: "CODE_93",
  code_128: "CODE_128",
  code128: "CODE_128",
  data_matrix: "DATA_MATRIX",
  datamatrix: "DATA_MATRIX",
  ean_8: "EAN_8",
  ean8: "EAN_8",
  ean_13: "EAN_13",
  ean13: "EAN_13",
  itf: "ITF",
  pdf417: "PDF_417",
  pdf_417: "PDF_417",
  upc_a: "UPC_A",
  upca: "UPC_A",
  upc_e: "UPC_E",
  upce: "UPC_E",
};

function normalizeTauriBarcodeFormats(formats: string[] | undefined) {
  if (!formats?.length) {
    return undefined;
  }

  const normalized = formats
    .map((format) => {
      const value = String(format).trim();
      return tauriBarcodeFormatsByInput[value.toLowerCase()] ?? value;
    })
    .filter(Boolean);

  return normalized.length > 0 ? normalized : undefined;
}

async function scanBarcodeWithTauriPlugin(
  invoke: TauriInvoke,
  input: NativeBarcodeScanInput = {},
): Promise<NativeBarcodeScanResult | null> {
  if (input.source === "image") {
    return null;
  }

  try {
    const result = await invoke("plugin:barcode-scanner|scan", {
      formats: normalizeTauriBarcodeFormats(input.formats),
      windowed: false,
      cameraDirection: "back",
    });

    return normalizeTauriBarcodePluginResult(result);
  } catch (error) {
    const reason = normalizeErrorReason(error);

    return isTauriBarcodePluginUnavailable(reason)
      ? null
      : {
          ok: false,
          reason,
          codes: [],
        };
  }
}

async function scanBarcodeWithBrowser(
  input: NativeBarcodeScanInput = {},
  globalScope: TauriGlobalScope | undefined = getDefaultGlobalScope(),
): Promise<NativeBarcodeScanResult> {
  if (input.source !== "image") {
    const permission = await ensureBrowserPermission(
      {
        kind: "camera",
        trigger: "on-demand",
        purpose: "scan-barcode",
      },
      globalScope,
    );

    if (!permission.ok) {
      return {
        ok: false,
        reason: permission.reason ?? "camera-permission-denied",
        codes: [],
      };
    }
  }

  if (typeof globalScope?.BarcodeDetector !== "function") {
    const picked = await pickBarcodeImageFile(input);

    return {
      ok: false,
      reason: picked.ok
        ? "barcode-detector-unavailable"
        : (picked.reason ?? "barcode-scan-unavailable"),
      codes: [],
      files: picked.pickedFile ? [picked.pickedFile] : [],
    };
  }

  if (typeof globalScope.createImageBitmap !== "function") {
    return {
      ok: false,
      reason: "barcode-image-decoder-unavailable",
      codes: [],
    };
  }

  const picked = await pickBarcodeImageFile(input);

  if (!picked.ok || !picked.file) {
    return {
      ok: false,
      reason: picked.reason ?? "barcode-scan-cancelled",
      codes: [],
      files: picked.pickedFile ? [picked.pickedFile] : [],
    };
  }

  try {
    const image = await globalScope.createImageBitmap(picked.file);
    const detector = new globalScope.BarcodeDetector({
      formats: input.formats,
    });
    const detected = await detector.detect?.(image);
    const codes =
      detected
        ?.filter((item) => typeof item.rawValue === "string" && item.rawValue)
        .map((item) => ({
          rawValue: item.rawValue as string,
          format: item.format,
        })) ?? [];

    return {
      ok: codes.length > 0,
      reason: codes.length > 0 ? undefined : "barcode-not-found",
      codes,
      files: picked.pickedFile ? [picked.pickedFile] : [],
    };
  } catch (error) {
    return {
      ok: false,
      reason: normalizeErrorReason(error),
      codes: [],
      files: picked.pickedFile ? [picked.pickedFile] : [],
    };
  }
}

function pickImagesWithAndroidBridge(
  input: NativeImagePickInput = {},
  globalScope: TauriGlobalScope | undefined = getDefaultGlobalScope(),
): NativeImagePickResult | null {
  const androidMedia = globalScope?.AndroidMedia;

  try {
    let value: string | NativeImagePickResult | boolean | undefined;

    if (input.capture) {
      if (typeof androidMedia?.captureImage !== "function") {
        return null;
      }
      value = androidMedia.captureImage(buildAndroidJsonInput(input));
    } else {
      if (typeof androidMedia?.pickImages !== "function") {
        return null;
      }
      value = androidMedia.pickImages(buildAndroidJsonInput(input));
    }

    return (
      parseAndroidImagePickBridgeResult(value) ??
      {
        ok: false,
        reason: "file-picker-invalid-result",
        files: [],
      }
    );
  } catch (error) {
    return {
      ok: false,
      reason: normalizeErrorReason(error),
      files: [],
    };
  }
}

function scanBarcodeWithAndroidBridge(
  input: NativeBarcodeScanInput = {},
  globalScope: TauriGlobalScope | undefined = getDefaultGlobalScope(),
): NativeBarcodeScanResult | null {
  const androidBarcode = globalScope?.AndroidBarcode;

  if (typeof androidBarcode?.scanBarcode !== "function") {
    return null;
  }

  try {
    return (
      parseAndroidBarcodeBridgeResult(
        androidBarcode.scanBarcode(buildAndroidJsonInput(input)),
      ) ?? {
        ok: false,
        reason: "barcode-scan-invalid-result",
        codes: [],
      }
    );
  } catch (error) {
    return {
      ok: false,
      reason: normalizeErrorReason(error),
      codes: [],
    };
  }
}

async function showBrowserNotification(
  input: NativeNotificationInput,
  globalScope: TauriGlobalScope | undefined = getDefaultGlobalScope(),
): Promise<NativeNotificationResult> {
  const permission = await ensureBrowserPermission(
    {
      kind: "notification",
      trigger: "on-demand",
      purpose: "show-notification",
    },
    globalScope,
  );

  if (!permission.ok || permission.status !== "granted") {
    return {
      ok: false,
      permission,
      reason: permission.reason ?? "notification-permission-denied",
    };
  }

  const androidNotification = globalScope?.AndroidNotification;
  if (typeof androidNotification?.showNotification === "function") {
    try {
      return {
        ...normalizeActionResult(
          parseAndroidActionBridgeResult(
            androidNotification.showNotification(
              input.title,
              input.body,
              input.tag,
            ),
            "notification-dispatch-failed",
          ),
        ),
        permission,
      };
    } catch (error) {
      return {
        ok: false,
        permission,
        reason: normalizeErrorReason(error),
      };
    }
  }

  if (typeof globalScope?.Notification === "function") {
    try {
      new globalScope.Notification(input.title, {
        body: input.body,
        tag: input.tag,
      });
      return {
        ok: true,
        permission,
        message: "notification-dispatched",
      };
    } catch (error) {
      return {
        ok: false,
        permission,
        reason: normalizeErrorReason(error),
      };
    }
  }

  return {
    ok: false,
    permission,
    reason: "notification-unavailable",
  };
}

function pickImagesWithInput(
  input: NativeImagePickInput = {},
): Promise<NativeImagePickResult> {
  const doc = getDefaultDocument();
  const win = getDefaultWindow();

  if (!doc?.body) {
    return Promise.resolve({
      ok: false,
      reason: "file-picker-unavailable",
      files: [],
    });
  }

  const documentRef = doc;

  return new Promise((resolve) => {
    const element = documentRef.createElement("input");
    const readAsDataUrl = input.readAsDataUrl ?? true;
    const timeoutMs =
      typeof input.timeoutMs === "number" && input.timeoutMs > 0
        ? input.timeoutMs
        : 60_000;
    const maxFiles =
      typeof input.maxFiles === "number" && input.maxFiles > 0
        ? Math.floor(input.maxFiles)
        : undefined;
    let completed = false;
    let blurSeen = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    element.type = "file";
    element.accept = input.accept ?? "image/*";
    element.multiple = input.multiple ?? true;
    element.style.display = "none";

    const capture = normalizeCapture(input.capture);
    if (capture) {
      element.setAttribute("capture", capture);
    }

    function cleanup() {
      if (timer) {
        win?.clearTimeout?.(timer);
        timer = null;
      }

      if (settleTimer) {
        win?.clearTimeout?.(settleTimer);
        settleTimer = null;
      }

      win?.removeEventListener?.(
        NATIVE_FILE_PICKER_CLOSED_EVENT,
        handleNativeFilePickerClosed,
      );
      win?.removeEventListener?.("focus", handleWindowFocus);
      win?.removeEventListener?.("blur", handleWindowBlur);
      documentRef.removeEventListener("visibilitychange", handleVisibilityChange);
      element.remove();
    }

    function finish(result: NativeImagePickResult) {
      if (completed) {
        return;
      }

      completed = true;
      cleanup();
      resolve(result);
    }

    function cancel(reason: string) {
      finish({
        ok: false,
        reason,
        files: [],
      });
    }

    function scheduleCancelCheck() {
      if (completed) {
        return;
      }

      if (settleTimer) {
        win?.clearTimeout?.(settleTimer);
      }

      const run = () => {
        if (!completed && !element.files?.length) {
          cancel("file-picker-cancelled");
        }
      };

      settleTimer = win?.setTimeout?.(run, 400) ?? null;
      if (!settleTimer) {
        run();
      }
    }

    function handleWindowBlur() {
      blurSeen = true;
    }

    function handleWindowFocus() {
      if (blurSeen) {
        scheduleCancelCheck();
      }
    }

    function handleVisibilityChange() {
      if (documentRef.visibilityState === "visible" && blurSeen) {
        scheduleCancelCheck();
      }
    }

    function handleNativeFilePickerClosed(event: Event) {
      const reason = normalizeFilePickerClosedReason(
        (event as CustomEvent<{ reason?: unknown }>).detail?.reason,
      );
      cancel(reason);
    }

    element.addEventListener(
      "change",
      async () => {
        const selectedFiles = Array.from(element.files ?? []);
        const files = maxFiles ? selectedFiles.slice(0, maxFiles) : selectedFiles;

        if (files.length === 0) {
          cancel("file-picker-cancelled");
          return;
        }

        finish({
          ok: true,
          files: await Promise.all(
            files.map((file) => normalizePickedFile(file, readAsDataUrl)),
          ),
        });
      },
      { once: true },
    );

    win?.addEventListener?.("blur", handleWindowBlur);
    win?.addEventListener?.("focus", handleWindowFocus);
    win?.addEventListener?.(
      NATIVE_FILE_PICKER_CLOSED_EVENT,
      handleNativeFilePickerClosed,
    );
    documentRef.addEventListener("visibilitychange", handleVisibilityChange);

    timer = win?.setTimeout?.(() => {
      cancel("file-picker-timeout");
    }, timeoutMs) ?? null;

    documentRef.body.append(element);
    element.click();
  });
}

function pickBarcodeImageFile(
  input: NativeBarcodeScanInput = {},
): Promise<{
  ok: boolean;
  reason?: string;
  file?: File;
  pickedFile?: NativePickedFile;
}> {
  const doc = getDefaultDocument();
  const win = getDefaultWindow();

  if (!doc?.body) {
    return Promise.resolve({
      ok: false,
      reason: "file-picker-unavailable",
    });
  }

  const documentRef = doc;

  return new Promise((resolve) => {
    const element = documentRef.createElement("input");
    const timeoutMs =
      typeof input.timeoutMs === "number" && input.timeoutMs > 0
        ? input.timeoutMs
        : 60_000;
    let completed = false;
    let blurSeen = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    element.type = "file";
    element.accept = "image/*";
    element.multiple = false;
    element.style.display = "none";

    if (input.source !== "image") {
      element.setAttribute("capture", "environment");
    }

    function cleanup() {
      if (timer) {
        win?.clearTimeout?.(timer);
        timer = null;
      }

      if (settleTimer) {
        win?.clearTimeout?.(settleTimer);
        settleTimer = null;
      }

      win?.removeEventListener?.(
        NATIVE_FILE_PICKER_CLOSED_EVENT,
        handleNativeFilePickerClosed,
      );
      win?.removeEventListener?.("focus", handleWindowFocus);
      win?.removeEventListener?.("blur", handleWindowBlur);
      documentRef.removeEventListener("visibilitychange", handleVisibilityChange);
      element.remove();
    }

    function finish(result: {
      ok: boolean;
      reason?: string;
      file?: File;
      pickedFile?: NativePickedFile;
    }) {
      if (completed) {
        return;
      }

      completed = true;
      cleanup();
      resolve(result);
    }

    function cancel(reason: string) {
      finish({
        ok: false,
        reason,
      });
    }

    function scheduleCancelCheck() {
      if (completed) {
        return;
      }

      if (settleTimer) {
        win?.clearTimeout?.(settleTimer);
      }

      const run = () => {
        if (!completed && !element.files?.length) {
          cancel("file-picker-cancelled");
        }
      };

      settleTimer = win?.setTimeout?.(run, 400) ?? null;
      if (!settleTimer) {
        run();
      }
    }

    function handleWindowBlur() {
      blurSeen = true;
    }

    function handleWindowFocus() {
      if (blurSeen) {
        scheduleCancelCheck();
      }
    }

    function handleVisibilityChange() {
      if (documentRef.visibilityState === "visible" && blurSeen) {
        scheduleCancelCheck();
      }
    }

    function handleNativeFilePickerClosed(event: Event) {
      const reason = normalizeFilePickerClosedReason(
        (event as CustomEvent<{ reason?: unknown }>).detail?.reason,
      );
      cancel(reason);
    }

    element.addEventListener(
      "change",
      async () => {
        const file = element.files?.[0];

        if (!file) {
          cancel("file-picker-cancelled");
          return;
        }

        finish({
          ok: true,
          file,
          pickedFile: await normalizePickedFile(file, true),
        });
      },
      { once: true },
    );

    win?.addEventListener?.("blur", handleWindowBlur);
    win?.addEventListener?.("focus", handleWindowFocus);
    win?.addEventListener?.(
      NATIVE_FILE_PICKER_CLOSED_EVENT,
      handleNativeFilePickerClosed,
    );
    documentRef.addEventListener("visibilitychange", handleVisibilityChange);

    timer = win?.setTimeout?.(() => {
      cancel("file-picker-timeout");
    }, timeoutMs) ?? null;

    documentRef.body.append(element);
    element.click();
  });
}

export function installNativeViewportInsets(
  options: NativeViewportInsetsOptions = {},
) {
  const maybeWindow =
    options.window ??
    (typeof window === "undefined" ? null : window);
  const maybeRoot =
    options.root ??
    maybeWindow?.document?.documentElement ??
    (typeof document === "undefined" ? null : document.documentElement);

  if (!maybeWindow || !maybeRoot) {
    return () => {};
  }

  const win = maybeWindow;
  const root = maybeRoot;
  const keyboardVariable = options.keyboardVariable ?? "--rtnn-keyboard-height";
  const keyboardAliasVariable = options.keyboardAliasVariable ?? "--skb";
  const minKeyboardHeight = options.minKeyboardHeight ?? 80;

  function updateKeyboardHeight() {
    const viewport = win.visualViewport;
    const rawHeight = viewport
      ? win.innerHeight - viewport.height - viewport.offsetTop
      : 0;
    const height = rawHeight >= minKeyboardHeight ? Math.round(rawHeight) : 0;

    root.style.setProperty(keyboardVariable, `${height}px`);
    root.style.setProperty(keyboardAliasVariable, `${height}px`);
  }

  updateKeyboardHeight();

  const viewport = win.visualViewport;
  viewport?.addEventListener("resize", updateKeyboardHeight);
  viewport?.addEventListener("scroll", updateKeyboardHeight);
  win.addEventListener("resize", updateKeyboardHeight);
  win.addEventListener("focusin", updateKeyboardHeight);
  win.addEventListener("focusout", updateKeyboardHeight);

  return () => {
    viewport?.removeEventListener("resize", updateKeyboardHeight);
    viewport?.removeEventListener("scroll", updateKeyboardHeight);
    win.removeEventListener("resize", updateKeyboardHeight);
    win.removeEventListener("focusin", updateKeyboardHeight);
    win.removeEventListener("focusout", updateKeyboardHeight);
  };
}

export function buildWebMapNavigationUrl(input: MapNavigationInput) {
  const hasCoords =
    typeof input.lat === "number" && typeof input.lng === "number";
  const name = input.name?.trim();

  if (!hasCoords && !name) {
    return null;
  }

  const encodedName = encodeURIComponent(name || "目的地");

  if (input.appType === "baidu") {
    if (hasCoords) {
      return `https://api.map.baidu.com/direction?destination=latlng:${input.lat},${input.lng}|name:${encodedName}&mode=driving&output=html&coord_type=gcj02`;
    }

    return `https://api.map.baidu.com/direction?destination=${encodedName}&mode=driving&output=html&coord_type=gcj02`;
  }

  if (input.appType === "tencent") {
    if (hasCoords) {
      return `https://apis.map.qq.com/uri/v1/routeplan?type=drive&tocoord=${input.lat},${input.lng}&to=${encodedName}`;
    }

    return `https://apis.map.qq.com/uri/v1/routeplan?type=drive&to=${encodedName}`;
  }

  if (hasCoords) {
    return `https://uri.amap.com/navigation?to=${input.lng},${input.lat},${encodedName}&mode=car`;
  }

  return `https://uri.amap.com/navigation?to=${encodedName}&mode=car`;
}

function buildNativeMapNavigationUrl(input: MapNavigationInput) {
  const hasCoords =
    typeof input.lat === "number" && typeof input.lng === "number";
  const name = input.name?.trim();

  if (!hasCoords && !name) {
    return null;
  }

  const appType = input.appType ?? "amap";
  const encodedName = encodeURIComponent(name || "目的地");
  const directNav = input.directNav ?? hasCoords;

  if (appType === "baidu") {
    if (hasCoords) {
      return `baidumap://map/direction?destination=latlng:${input.lat},${input.lng}|name:${encodedName}&coord_type=gcj02&mode=driving`;
    }

    return `baidumap://map/direction?destination=${encodedName}&mode=driving`;
  }

  if (appType === "tencent") {
    if (hasCoords) {
      return `qqmap://map/routeplan?type=drive&tocoord=${input.lat},${input.lng}&to=${encodedName}`;
    }

    return `qqmap://map/routeplan?type=drive&to=${encodedName}`;
  }

  if (hasCoords && directNav) {
    return `androidamap://navi?sourceApplication=rtnn&lat=${input.lat}&lon=${input.lng}&poiname=${encodedName}&dev=0&style=2`;
  }

  if (hasCoords) {
    return `androidamap://route/plan?sourceApplication=rtnn&dlat=${input.lat}&dlon=${input.lng}&dname=${encodedName}&dev=0&t=0`;
  }

  return `androidamap://route/plan?sourceApplication=rtnn&dname=${encodedName}&dev=0&t=0`;
}

export function createBrowserNativeBridge(
  options: CreateBrowserNativeBridgeOptions = {},
): NativeBridge {
  const globalScope = options.globalScope ?? getDefaultGlobalScope();

  return {
    async getClientInfo() {
      return {
        runtime: "browser",
        shell: null,
        platform: detectBrowserPlatform(
          options.userAgent ?? globalScope?.navigator?.userAgent,
        ),
        appVersion: null,
        bridgeVersion: NATIVE_BRIDGE_VERSION,
        channel: options.channel ?? "dev",
        sourceSha: options.sourceSha,
        features: [],
      };
    },

    async openExternal(input) {
      const opened = openBrowserUrl(
        input.url,
        input.target,
        options.open ?? globalScope?.open,
      );
      return opened
        ? { ok: true }
        : { ok: false, reason: "browser-open-unavailable" };
    },

    async openInAppWebView(input) {
      const opened = openBrowserUrl(
        input.url,
        "_self",
        options.open ?? globalScope?.open,
      );
      return opened
        ? { ok: true, message: "opened-in-app-webview" }
        : { ok: false, reason: "browser-open-unavailable" };
    },

    async openMapNavigation(input) {
      const androidResult = openAndroidMapWithBridge(input, globalScope);
      if (androidResult) {
        return androidResult;
      }

      if (detectBrowserPlatform(globalScope?.navigator?.userAgent) === "android") {
        if (input.allowWebFallback === false) {
          return {
            ok: false,
            reason: "native-map-open-unavailable",
          };
        }
      }

      const url = buildWebMapNavigationUrl(input);

      if (!url) {
        return { ok: false, reason: "missing-map-target" };
      }

      const opened = openBrowserUrl(url, "_blank", options.open ?? globalScope?.open);
      return opened
        ? { ok: true, message: "已打开网页版地图" }
        : { ok: false, reason: "browser-open-unavailable" };
    },

    async checkMapInstalled(input) {
      const androidResult = checkAndroidMapInstalledWithBridge(
        input.appType,
        globalScope,
      );
      if (androidResult) {
        return androidResult;
      }

      return {
        ok: true,
        appType: input.appType,
        installed: null,
        status: "unknown",
        reason: "map-install-check-unavailable",
      };
    },

    async checkPermission(input) {
      return checkBrowserPermission(input, globalScope);
    },

    async requestPermission(input) {
      return requestBrowserPermission(input, globalScope);
    },

    async ensurePermission(input) {
      return ensureBrowserPermission(input, globalScope);
    },

    async pickImages(input) {
      const androidResult = pickImagesWithAndroidBridge(input, globalScope);
      if (androidResult) {
        return androidResult;
      }

      return pickImagesWithInput(input);
    },

    async scanBarcode(input) {
      const tauriInvoke = getTauriInvoke(globalScope);
      const pluginResult = tauriInvoke
        ? await scanBarcodeWithTauriPlugin(tauriInvoke, input)
        : null;
      if (pluginResult) {
        return pluginResult;
      }

      const androidResult = scanBarcodeWithAndroidBridge(input, globalScope);
      if (androidResult) {
        return androidResult;
      }

      return scanBarcodeWithBrowser(input, globalScope);
    },

    async showNotification(input) {
      return showBrowserNotification(input, globalScope);
    },

    async checkUpdate() {
      return {
        ok: false,
        reason: "updater-unavailable",
        update: {
          available: false,
        },
      };
    },

    async installUpdate() {
      return {
        ok: false,
        reason: "updater-unavailable",
      };
    },
  };
}

export function getTauriInvoke(
  globalScope: TauriGlobalScope | undefined = getDefaultGlobalScope(),
): TauriInvoke | null {
  const candidates = [
    globalScope?.__TAURI__?.core?.invoke,
    globalScope?.__TAURI__?.invoke,
    globalScope?.__TAURI_INTERNALS__?.invoke,
  ];
  const invoke = candidates.find((candidate) => typeof candidate === "function");

  return invoke ?? null;
}

export function hasNativeFeature(
  info: Pick<NativeClientInfo, "features"> | null | undefined,
  feature: NativeFeature,
) {
  return Boolean(info?.features?.includes(feature));
}

export function resolveNativeClientUpdateQuery(
  info: NativeClientInfo | null | undefined,
): NativeClientUpdateQuery | null {
  if (
    !info ||
    info.runtime !== "tauri" ||
    (info.shell !== "admin-desktop" && info.shell !== "app-mobile") ||
    info.platform === "web"
  ) {
    return null;
  }

  return {
    client: info.shell === "admin-desktop" ? "adminDesktop" : "appMobile",
    target: info.platform,
    channel: info.channel,
    currentVersion: info.appVersion ?? undefined,
  };
}

function normalizeErrorReason(error: unknown) {
  const message =
    error instanceof Error
      ? error.message || "native-command-failed"
      : String(error || "native-command-failed");

  if (message.includes(ANDROID_NON_INJECTED_BRIDGE_ERROR)) {
    return "native-bridge-not-ready";
  }

  if (error instanceof Error) {
    return message;
  }

  return message;
}

function normalizeReason(reason: unknown) {
  return reason ? normalizeErrorReason(reason) : undefined;
}

function normalizeActionResult(
  result: NativeBridgeActionResult | null | undefined,
): NativeBridgeActionResult {
  if (result && typeof result.ok === "boolean") {
    const normalized: NativeBridgeActionResult = {
      ok: result.ok,
    };
    const reason = normalizeReason(result.reason);

    if (typeof result.message === "string") {
      normalized.message = result.message;
    }

    if (typeof reason === "string") {
      normalized.reason = reason;
    }

    if (typeof result.dispatched === "boolean") {
      normalized.dispatched = result.dispatched;
    }

    return normalized;
  }

  return { ok: true };
}

function normalizePermissionResult(
  result: NativePermissionResult | null | undefined,
  input: NativePermissionInput,
): NativePermissionResult {
  if (!result || typeof result !== "object") {
    return makePermissionResult(input, "unknown", { requested: false });
  }

  const status = normalizePermissionStatus(result.status);

  return makePermissionResult(input, status, {
    ok:
      typeof result.ok === "boolean"
        ? result.ok
        : isPermissionUsable(input.kind, status),
    requested: result.requested,
    canAskAgain: result.canAskAgain,
    message: result.message ?? undefined,
    reason: normalizeReason(result.reason),
    dispatched: result.dispatched,
  });
}

function normalizeMapInstallResult(
  result: NativeMapInstallResult | null | undefined,
  appType: MapAppType,
): NativeMapInstallResult {
  if (!result || typeof result !== "object") {
    return {
      ok: true,
      appType,
      installed: null,
      status: "unknown",
      reason: "map-install-check-unavailable",
    };
  }

  const installed =
    typeof result.installed === "boolean" ? result.installed : null;
  const status =
    result.status === "installed" ||
    result.status === "not-installed" ||
    result.status === "unknown" ||
    result.status === "unsupported"
      ? result.status
      : installed === true
        ? "installed"
        : installed === false
          ? "not-installed"
          : "unknown";

  return {
    ok:
      typeof result.ok === "boolean"
        ? result.ok
        : status !== "unsupported" && status !== "not-installed",
    appType: result.appType ?? appType,
    installed,
    status,
    message: result.message ?? undefined,
    reason: normalizeReason(result.reason),
    diagnostic: normalizeReason(result.diagnostic),
  };
}

function joinAndroidMapPackages(appType: MapAppType) {
  return (NATIVE_MAP_ANDROID_PACKAGES[appType] ?? []).join("|");
}

function parseAndroidMapBridgeResult(
  value: unknown,
  appType: MapAppType,
): NativeMapInstallResult | null {
  if (typeof value === "boolean") {
    return {
      ok: value,
      appType,
      installed: value,
      status: value ? "installed" : "not-installed",
      reason: value ? undefined : "map-app-not-installed",
    };
  }

  if (typeof value === "string") {
    try {
      return normalizeMapInstallResult(JSON.parse(value), appType);
    } catch {
      return {
        ok: true,
        appType,
        installed: null,
        status: "unknown",
        reason: normalizeReason(value) ?? "map-install-check-invalid-result",
      };
    }
  }

  if (value && typeof value === "object") {
    return normalizeMapInstallResult(
      value as NativeMapInstallResult,
      appType,
    );
  }

  return null;
}

function parseAndroidMapOpenBridgeResult(
  value: unknown,
  appType: MapAppType,
): NativeBridgeActionResult | null {
  if (typeof value === "boolean") {
    return {
      ok: value,
      message: value ? "opened-native-map" : undefined,
      reason: value ? undefined : "native-map-open-failed",
    };
  }

  if (typeof value === "string") {
    try {
      return normalizeActionResult(JSON.parse(value));
    } catch {
      return {
        ok: false,
        reason: normalizeReason(value) ?? "native-map-open-invalid-result",
      };
    }
  }

  if (value && typeof value === "object") {
    return normalizeActionResult(value as NativeBridgeActionResult);
  }

  return {
    ok: false,
    reason: `${appType}-native-map-open-invalid-result`,
  };
}

function parseAndroidActionBridgeResult(
  value: unknown,
  fallbackReason: string,
): NativeBridgeActionResult | null {
  if (typeof value === "boolean") {
    return {
      ok: value,
      reason: value ? undefined : fallbackReason,
    };
  }

  if (typeof value === "string") {
    try {
      return normalizeActionResult(JSON.parse(value));
    } catch {
      return {
        ok: false,
        reason: normalizeReason(value) ?? fallbackReason,
      };
    }
  }

  if (value && typeof value === "object") {
    return normalizeActionResult(value as NativeBridgeActionResult);
  }

  return null;
}

function isMapCandidateAvailable(result: NativeMapInstallResult) {
  return result.status === "installed";
}

function isMapDetectionUncertain(result: NativeMapInstallResult) {
  return (
    result.status === "unknown" ||
    result.reason === "map-app-not-installed-or-not-visible" ||
    result.reason === "map-install-check-unavailable"
  );
}

function shouldSkipNativeMapCandidate(
  result: NativeMapInstallResult,
  options: { userSelected?: boolean } = {},
) {
  if (result.status === "unsupported") {
    return true;
  }

  if (options.userSelected) {
    return result.status !== "installed";
  }

  return result.status === "not-installed" && !isMapDetectionUncertain(result);
}

function normalizeClientInfo(
  value: NativeClientInfo | null | undefined,
): NativeClientInfo | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (value.runtime !== "tauri") {
    return null;
  }

  if (value.shell !== "admin-desktop" && value.shell !== "app-mobile") {
    return null;
  }

  return {
    runtime: "tauri",
    shell: value.shell,
    platform: value.platform ?? "web",
    appVersion: value.appVersion ?? null,
    bridgeVersion: value.bridgeVersion ?? NATIVE_BRIDGE_VERSION,
    channel: value.channel ?? "dev",
    sourceSha: value.sourceSha,
    features: Array.isArray(value.features) ? value.features : [],
  };
}

function checkAndroidMapInstalledWithBridge(
  appType: MapAppType,
  globalScope: TauriGlobalScope | undefined = getDefaultGlobalScope(),
): NativeMapInstallResult | null {
  const packageName = joinAndroidMapPackages(appType);
  const androidMap = globalScope?.AndroidMap;

  if (
    !packageName ||
    (typeof androidMap?.checkAppInstalled !== "function" &&
      typeof androidMap?.isAppInstalled !== "function")
  ) {
    return null;
  }

  try {
    if (typeof androidMap.checkAppInstalled === "function") {
      return (
        parseAndroidMapBridgeResult(
          androidMap.checkAppInstalled(packageName),
          appType,
        ) ?? {
          ok: true,
          appType,
          installed: null,
          status: "unknown",
          reason: "map-install-check-invalid-result",
        }
      );
    }

    if (typeof androidMap.isAppInstalled !== "function") {
      return {
        ok: true,
        appType,
        installed: null,
        status: "unknown",
        reason: "map-install-check-unavailable",
      };
    }

    const installed = packageName
      .split("|")
      .filter(Boolean)
      .some((candidatePackageName) =>
        Boolean(androidMap.isAppInstalled?.(candidatePackageName)),
      );

    return {
      ok: installed,
      appType,
      installed,
      status: installed ? "installed" : "not-installed",
      reason: installed ? undefined : "map-app-not-installed",
    };
  } catch (error) {
    return {
      ok: true,
      appType,
      installed: null,
      status: "unknown",
      reason: normalizeErrorReason(error),
    };
  }
}

function openAndroidMapWithBridge(
  input: MapNavigationInput,
  globalScope: TauriGlobalScope | undefined = getDefaultGlobalScope(),
): NativeBridgeActionResult | null {
  const appType = input.appType ?? "amap";
  const androidMap = globalScope?.AndroidMap;

  if (typeof androidMap?.openNavigation !== "function") {
    if (input.allowWebFallback === false && shouldWaitForAndroidMapBridge(globalScope)) {
      return {
        ok: false,
        reason: "native-map-open-unavailable",
      };
    }

    return null;
  }

  const nativeUrl = buildNativeMapNavigationUrl({
    ...input,
    appType,
  });

  if (!nativeUrl) {
    return { ok: false, reason: "missing-map-target" };
  }

  try {
    const result = parseAndroidMapOpenBridgeResult(
      androidMap.openNavigation(appType, nativeUrl),
      appType,
    );

    if (
      !result?.ok &&
      input.allowWebFallback === false &&
      result?.reason === "native-map-no-handler" &&
      dispatchAndroidIntentUrl(nativeUrl, globalScope)
    ) {
      return {
        ok: true,
        dispatched: true,
        message: "opened-native-map",
      };
    }

    return result;
  } catch (error) {
    return {
      ok: false,
      reason: normalizeErrorReason(error),
    };
  }
}

function shouldWaitForAndroidMapBridge(
  globalScope: TauriGlobalScope | undefined = getDefaultGlobalScope(),
) {
  return detectBrowserPlatform(globalScope?.navigator?.userAgent) === "android";
}

function isNativeBridgeNotReadyResult(result: { reason?: string } | null) {
  return result?.reason === "native-bridge-not-ready";
}

function isAndroidMapBridgeNotReady(result: NativeMapInstallResult | null) {
  return isNativeBridgeNotReadyResult(result);
}

function getAndroidBridgeObject(
  globalScope: TauriGlobalScope | undefined,
  bridgeName: string,
) {
  return (globalScope as unknown as Record<string, unknown> | undefined)?.[
    bridgeName
  ] as Record<string, unknown> | undefined;
}

function hasAndroidBridgeMethod(
  globalScope: TauriGlobalScope | undefined,
  bridgeName: string,
  methodName: string | string[],
) {
  const bridge = getAndroidBridgeObject(globalScope, bridgeName);
  const methodNames = Array.isArray(methodName) ? methodName : [methodName];

  return methodNames.some((item) => typeof bridge?.[item] === "function");
}

function waitForAndroidBridgeMethod(
  globalScope: TauriGlobalScope | undefined,
  bridgeName: string,
  methodName: string | string[],
  options: { force?: boolean; eventName?: string } = {},
): Promise<void> {
  if (
    (!options.force && hasAndroidBridgeMethod(globalScope, bridgeName, methodName)) ||
    !shouldWaitForAndroidMapBridge(globalScope)
  ) {
    return Promise.resolve();
  }

  const setTimer = globalScope?.setTimeout ?? setTimeout;
  const clearTimer = globalScope?.clearTimeout ?? clearTimeout;
  const deadline = Date.now() + ANDROID_MAP_BRIDGE_WAIT_MS;
  const initialBridge = getAndroidBridgeObject(globalScope, bridgeName);
  const methodNames = Array.isArray(methodName) ? methodName : [methodName];
  const readinessEvents = [
    NATIVE_ANDROID_READY_EVENT,
    options.eventName,
  ].filter((item): item is string => Boolean(item));

  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let completed = false;

    const cleanup = () => {
      for (const eventName of readinessEvents) {
        globalScope?.removeEventListener?.(eventName, finish);
      }
    };

    const finish = () => {
      if (completed) {
        return;
      }

      completed = true;
      if (timer) {
        clearTimer(timer);
      }
      cleanup();
      resolve();
    };

    const bridgeChangedAndReady = () => {
      const bridge = getAndroidBridgeObject(globalScope, bridgeName);
      return (
        options.force &&
        initialBridge &&
        bridge &&
        bridge !== initialBridge &&
        methodNames.some((item) => typeof bridge[item] === "function")
      );
    };

    const tick = () => {
      if (
        bridgeChangedAndReady() ||
        (!options.force && hasAndroidBridgeMethod(globalScope, bridgeName, methodName)) ||
        Date.now() >= deadline
      ) {
        finish();
        return;
      }

      timer = setTimer(tick, ANDROID_MAP_BRIDGE_POLL_MS);
    };

    for (const eventName of readinessEvents) {
      globalScope?.addEventListener?.(eventName, finish);
    }
    tick();
  });
}

function waitForAndroidMapBridge(
  globalScope: TauriGlobalScope | undefined = getDefaultGlobalScope(),
  options: { force?: boolean } = {},
): Promise<void> {
  if (!options.force && hasAndroidBridgeMethod(globalScope, "AndroidMap", "isAppInstalled")) {
    return Promise.resolve();
  }

  return waitForAndroidBridgeMethod(
    globalScope,
    "AndroidMap",
    ["checkAppInstalled", "isAppInstalled"],
    {
      force: options.force,
      eventName: NATIVE_ANDROID_MAP_READY_EVENT,
    },
  );
}

export function createDetectedTauriNativeBridge(
  options: CreateDetectedTauriNativeBridgeOptions,
): NativeBridge {
  const fallback = options.fallback ?? createBrowserNativeBridge();
  const globalScope = options.globalScope ?? getDefaultGlobalScope();

  return {
    async getClientInfo() {
      try {
        const result = await options.invoke<NativeClientInfo>(
          options.getClientInfoCommand ?? "get_client_info",
        );
        return normalizeClientInfo(result) ?? fallback.getClientInfo();
      } catch {
        return fallback.getClientInfo();
      }
    },

    async openExternal(input) {
      try {
        return normalizeActionResult(
          await options.invoke<NativeBridgeActionResult>(
            options.openExternalCommand ?? "open_external",
            {
              url: input.url,
              target: input.target ?? "_blank",
            },
          ),
        );
      } catch {
        return fallback.openExternal(input);
      }
    },

    async openInAppWebView(input) {
      try {
        return normalizeActionResult(
          await options.invoke<NativeBridgeActionResult>(
            options.openInAppWebViewCommand ?? "open_in_app_webview",
            {
              url: input.url,
            },
          ),
        );
      } catch {
        return fallback.openInAppWebView(input);
      }
    },

    async openMapNavigation(input) {
      const androidResult = openAndroidMapWithBridge(input, globalScope);
      if (androidResult?.ok) {
        return androidResult;
      }

      if (androidResult && input.allowWebFallback === false) {
        return androidResult;
      }

      try {
        return normalizeActionResult(
          await options.invoke<NativeBridgeActionResult>(
            options.mapNavigationCommand ?? "open_map_navigation",
            {
              lat: input.lat ?? null,
              lng: input.lng ?? null,
              name: input.name ?? null,
              appType: input.appType ?? "amap",
              directNav:
                input.directNav ??
                (typeof input.lat === "number" && typeof input.lng === "number"),
              allowWebFallback: input.allowWebFallback ?? true,
            },
          ),
        );
      } catch (error) {
        const fallbackResult = await fallback.openMapNavigation(input);

        if (fallbackResult.ok) {
          return fallbackResult;
        }

        return { ok: false, reason: normalizeErrorReason(error) };
      }
    },

    async checkMapInstalled(input) {
      const androidResult = checkAndroidMapInstalledWithBridge(
        input.appType,
        globalScope,
      );
      if (androidResult && !isAndroidMapBridgeNotReady(androidResult)) {
        return androidResult;
      }

      await waitForAndroidMapBridge(globalScope, {
        force: isAndroidMapBridgeNotReady(androidResult),
      });

      const delayedAndroidResult = checkAndroidMapInstalledWithBridge(
        input.appType,
        globalScope,
      );
      if (delayedAndroidResult && !isAndroidMapBridgeNotReady(delayedAndroidResult)) {
        return delayedAndroidResult;
      }

      try {
        return normalizeMapInstallResult(
          await options.invoke<NativeMapInstallResult>(
            options.checkMapInstalledCommand ?? "check_map_installed",
            {
              appType: input.appType,
            },
          ),
          input.appType,
        );
      } catch {
        return fallback.checkMapInstalled(input);
      }
    },

    async checkPermission(input) {
      const normalized = normalizePermissionInput(input);
      const androidResult = checkAndroidPermissionWithBridge(
        normalized,
        globalScope,
      );

      if (androidResult && !isNativeBridgeNotReadyResult(androidResult)) {
        return androidResult;
      }

      if (isNativeBridgeNotReadyResult(androidResult)) {
        await waitForAndroidBridgeMethod(
          globalScope,
          "AndroidPermission",
          "checkPermission",
          { force: true },
        );

        const delayedAndroidResult = checkAndroidPermissionWithBridge(
          normalized,
          globalScope,
        );

        if (
          delayedAndroidResult &&
          !isNativeBridgeNotReadyResult(delayedAndroidResult)
        ) {
          return delayedAndroidResult;
        }
      }

      try {
        return normalizePermissionResult(
          await options.invoke<NativePermissionResult>(
            options.checkPermissionCommand ?? "check_permission",
            {
              kind: normalized.kind,
              trigger: normalized.trigger,
              purpose: normalized.purpose,
            },
          ),
          normalized,
        );
      } catch {
        return fallback.checkPermission(normalized);
      }
    },

    async requestPermission(input) {
      const normalized = normalizePermissionInput(input);
      const androidResult = requestAndroidPermissionWithBridge(
        normalized,
        globalScope,
      );

      if (androidResult && !isNativeBridgeNotReadyResult(androidResult)) {
        return waitForAndroidPermissionChange(
          normalized,
          androidResult,
          globalScope,
        );
      }

      if (isNativeBridgeNotReadyResult(androidResult)) {
        await waitForAndroidBridgeMethod(
          globalScope,
          "AndroidPermission",
          "requestPermission",
          { force: true },
        );

        const delayedAndroidResult = requestAndroidPermissionWithBridge(
          normalized,
          globalScope,
        );

        if (
          delayedAndroidResult &&
          !isNativeBridgeNotReadyResult(delayedAndroidResult)
        ) {
          return waitForAndroidPermissionChange(
            normalized,
            delayedAndroidResult,
            globalScope,
          );
        }
      }

      try {
        return normalizePermissionResult(
          await options.invoke<NativePermissionResult>(
            options.requestPermissionCommand ?? "request_permission",
            {
              kind: normalized.kind,
              trigger: normalized.trigger,
              purpose: normalized.purpose,
            },
          ),
          normalized,
        );
      } catch {
        return fallback.requestPermission(normalized);
      }
    },

    async ensurePermission(input) {
      const normalized = normalizePermissionInput(input);
      const checked = await this.checkPermission(normalized);

      if (checked.status === "granted") {
        return checked;
      }

      if (checked.status === "denied" || checked.status === "unsupported") {
        return checked;
      }

      return this.requestPermission({
        ...normalized,
        trigger: normalized.trigger ?? "on-demand",
      });
    },

    async pickImages(input) {
      const androidResult = pickImagesWithAndroidBridge(input, globalScope);
      if (androidResult && !isNativeBridgeNotReadyResult(androidResult)) {
        return androidResult;
      }

      if (isNativeBridgeNotReadyResult(androidResult)) {
        await waitForAndroidBridgeMethod(
          globalScope,
          "AndroidMedia",
          input?.capture ? "captureImage" : "pickImages",
          { force: true },
        );

        const delayedAndroidResult = pickImagesWithAndroidBridge(input, globalScope);
        if (
          delayedAndroidResult &&
          !isNativeBridgeNotReadyResult(delayedAndroidResult)
        ) {
          return delayedAndroidResult;
        }
      }

      return fallback.pickImages(input);
    },

    async scanBarcode(input) {
      const pluginResult = await scanBarcodeWithTauriPlugin(options.invoke, input);
      if (pluginResult) {
        return pluginResult;
      }

      const androidResult = scanBarcodeWithAndroidBridge(input, globalScope);
      if (androidResult && !isNativeBridgeNotReadyResult(androidResult)) {
        return androidResult;
      }

      if (isNativeBridgeNotReadyResult(androidResult)) {
        await waitForAndroidBridgeMethod(
          globalScope,
          "AndroidBarcode",
          "scanBarcode",
          { force: true },
        );

        const delayedAndroidResult = scanBarcodeWithAndroidBridge(input, globalScope);
        if (
          delayedAndroidResult &&
          !isNativeBridgeNotReadyResult(delayedAndroidResult)
        ) {
          return delayedAndroidResult;
        }
      }

      try {
        return normalizeBarcodeScanResult(
          await options.invoke<NativeBarcodeScanResult>(
            options.scanBarcodeCommand ?? "scan_barcode",
            {
              source: input?.source ?? "camera",
              formats: input?.formats ?? null,
              timeoutMs: input?.timeoutMs ?? null,
            },
          ),
        );
      } catch {
        return fallback.scanBarcode(input);
      }
    },

    async showNotification(input) {
      const androidResult = await showBrowserNotification(input, globalScope);
      if (androidResult.ok || androidResult.reason !== "notification-unavailable") {
        return androidResult;
      }

      try {
        return {
          ...normalizeActionResult(
            await options.invoke<NativeBridgeActionResult>(
              options.showNotificationCommand ?? "show_notification",
              {
                title: input.title,
                body: input.body ?? null,
                tag: input.tag ?? null,
              },
            ),
          ),
          permission: androidResult.permission,
        };
      } catch {
        return fallback.showNotification(input);
      }
    },

    async checkUpdate() {
      try {
        const result = await options.invoke<NativeUpdateCheckResult>(
          options.checkUpdateCommand ?? "check_update",
        );

        return result ?? { ok: false, reason: "updater-unavailable" };
      } catch (error) {
        return {
          ok: false,
          reason: normalizeErrorReason(error),
          update: {
            available: false,
          },
        };
      }
    },

    async installUpdate() {
      try {
        return normalizeActionResult(
          await options.invoke<NativeBridgeActionResult>(
            options.installUpdateCommand ?? "install_update",
          ),
        );
      } catch (error) {
        return {
          ok: false,
          reason: normalizeErrorReason(error),
        };
      }
    },
  };
}

export function createTauriNativeBridge(
  options: CreateTauriNativeBridgeOptions,
): NativeBridge {
  const features = options.features ?? [
    "external.open",
    "webview.open",
    "map.navigation",
  ];

  return {
    async getClientInfo() {
      return {
        runtime: "tauri",
        shell: options.shell,
        platform: options.platform,
        appVersion: options.appVersion,
        bridgeVersion: NATIVE_BRIDGE_VERSION,
        channel: options.channel,
        sourceSha: options.sourceSha,
        features,
      };
    },

    async openExternal(input) {
      const result = await options.invoke<NativeBridgeActionResult>(
        options.openExternalCommand ?? "open_external",
        {
          url: input.url,
          target: input.target ?? "_blank",
        },
      );

      return result ?? { ok: true };
    },

    async openInAppWebView(input) {
      const result = await options.invoke<NativeBridgeActionResult>(
        options.openInAppWebViewCommand ?? "open_in_app_webview",
        {
          url: input.url,
        },
      );

      return normalizeActionResult(result);
    },

    async openMapNavigation(input) {
      const androidResult = openAndroidMapWithBridge(input);
      if (androidResult?.ok) {
        return androidResult;
      }

      if (androidResult && input.allowWebFallback === false) {
        return androidResult;
      }

      const result = await options.invoke<NativeBridgeActionResult>(
        options.mapNavigationCommand ?? "open_map_navigation",
        {
          lat: input.lat ?? null,
          lng: input.lng ?? null,
          name: input.name ?? null,
          appType: input.appType ?? "amap",
          directNav:
            input.directNav ??
            (typeof input.lat === "number" && typeof input.lng === "number"),
          allowWebFallback: input.allowWebFallback ?? true,
        },
      );

      return result ?? { ok: true };
    },

    async checkMapInstalled(input) {
      const androidResult = checkAndroidMapInstalledWithBridge(input.appType);
      if (androidResult && !isAndroidMapBridgeNotReady(androidResult)) {
        return androidResult;
      }

      await waitForAndroidMapBridge(undefined, {
        force: isAndroidMapBridgeNotReady(androidResult),
      });

      const delayedAndroidResult = checkAndroidMapInstalledWithBridge(input.appType);
      if (delayedAndroidResult && !isAndroidMapBridgeNotReady(delayedAndroidResult)) {
        return delayedAndroidResult;
      }

      return normalizeMapInstallResult(
        await options.invoke<NativeMapInstallResult>(
          options.checkMapInstalledCommand ?? "check_map_installed",
          {
            appType: input.appType,
          },
        ),
        input.appType,
      );
    },

    async checkPermission(input) {
      const normalized = normalizePermissionInput(input);
      const androidResult = checkAndroidPermissionWithBridge(normalized);

      if (androidResult) {
        return androidResult;
      }

      return normalizePermissionResult(
        await options.invoke<NativePermissionResult>(
          options.checkPermissionCommand ?? "check_permission",
          {
            kind: normalized.kind,
            trigger: normalized.trigger,
            purpose: normalized.purpose,
          },
        ),
        normalized,
      );
    },

    async requestPermission(input) {
      const normalized = normalizePermissionInput(input);
      const androidResult = requestAndroidPermissionWithBridge(normalized);

      if (androidResult) {
        return waitForAndroidPermissionChange(normalized, androidResult);
      }

      return normalizePermissionResult(
        await options.invoke<NativePermissionResult>(
          options.requestPermissionCommand ?? "request_permission",
          {
            kind: normalized.kind,
            trigger: normalized.trigger,
            purpose: normalized.purpose,
          },
        ),
        normalized,
      );
    },

    async ensurePermission(input) {
      const normalized = normalizePermissionInput(input);
      const checked = await this.checkPermission(normalized);

      if (checked.status === "granted") {
        return checked;
      }

      if (checked.status === "denied" || checked.status === "unsupported") {
        return checked;
      }

      return this.requestPermission({
        ...normalized,
        trigger: normalized.trigger ?? "on-demand",
      });
    },

    async pickImages(input) {
      const androidResult = pickImagesWithAndroidBridge(input);
      if (androidResult && !isNativeBridgeNotReadyResult(androidResult)) {
        return androidResult;
      }

      if (isNativeBridgeNotReadyResult(androidResult)) {
        await waitForAndroidBridgeMethod(
          undefined,
          "AndroidMedia",
          input?.capture ? "captureImage" : "pickImages",
          { force: true },
        );

        const delayedAndroidResult = pickImagesWithAndroidBridge(input);
        if (
          delayedAndroidResult &&
          !isNativeBridgeNotReadyResult(delayedAndroidResult)
        ) {
          return delayedAndroidResult;
        }
      }

      return pickImagesWithInput(input);
    },

    async scanBarcode(input) {
      const pluginResult = await scanBarcodeWithTauriPlugin(options.invoke, input);
      if (pluginResult) {
        return pluginResult;
      }

      const androidResult = scanBarcodeWithAndroidBridge(input);
      if (androidResult && !isNativeBridgeNotReadyResult(androidResult)) {
        return androidResult;
      }

      if (isNativeBridgeNotReadyResult(androidResult)) {
        await waitForAndroidBridgeMethod(
          undefined,
          "AndroidBarcode",
          "scanBarcode",
          { force: true },
        );

        const delayedAndroidResult = scanBarcodeWithAndroidBridge(input);
        if (
          delayedAndroidResult &&
          !isNativeBridgeNotReadyResult(delayedAndroidResult)
        ) {
          return delayedAndroidResult;
        }
      }

      try {
        return normalizeBarcodeScanResult(
          await options.invoke<NativeBarcodeScanResult>(
            options.scanBarcodeCommand ?? "scan_barcode",
            {
              source: input?.source ?? "camera",
              formats: input?.formats ?? null,
              timeoutMs: input?.timeoutMs ?? null,
            },
          ),
        );
      } catch {
        return scanBarcodeWithBrowser(input);
      }
    },

    async showNotification(input) {
      const androidResult = await showBrowserNotification(input);
      if (androidResult.ok || androidResult.reason !== "notification-unavailable") {
        return androidResult;
      }

      return {
        ...normalizeActionResult(
          await options.invoke<NativeBridgeActionResult>(
            options.showNotificationCommand ?? "show_notification",
            {
              title: input.title,
              body: input.body ?? null,
              tag: input.tag ?? null,
            },
          ),
        ),
        permission: androidResult.permission,
      };
    },

    async checkUpdate() {
      const result = await options.invoke<NativeUpdateCheckResult>(
        options.checkUpdateCommand ?? "check_update",
      );

      return result ?? { ok: false, reason: "updater-unavailable" };
    },

    async installUpdate() {
      const result = await options.invoke<NativeBridgeActionResult>(
        options.installUpdateCommand ?? "install_update",
      );

      return result ?? { ok: true };
    },
  };
}

export function createNativeBridge(
  options: CreateNativeBridgeOptions = {},
): NativeBridge {
  const fallback =
    options.fallback ??
    createBrowserNativeBridge({
      channel: options.channel,
      sourceSha: options.sourceSha,
      open: options.open,
      userAgent: options.userAgent,
      globalScope: options.globalScope,
    });
  const invoke = options.invoke ?? getTauriInvoke(options.globalScope);

  if (!invoke) {
    return fallback;
  }

  return createDetectedTauriNativeBridge({
    invoke,
    fallback,
    globalScope: options.globalScope,
    getClientInfoCommand: options.getClientInfoCommand,
    openExternalCommand: options.openExternalCommand,
    openInAppWebViewCommand: options.openInAppWebViewCommand,
    mapNavigationCommand: options.mapNavigationCommand,
    checkMapInstalledCommand: options.checkMapInstalledCommand,
    checkPermissionCommand: options.checkPermissionCommand,
    requestPermissionCommand: options.requestPermissionCommand,
    scanBarcodeCommand: options.scanBarcodeCommand,
    showNotificationCommand: options.showNotificationCommand,
    checkUpdateCommand: options.checkUpdateCommand,
    installUpdateCommand: options.installUpdateCommand,
  });
}

export function createNativeCapabilityCore(
  options: CreateNativeCapabilityCoreOptions = {},
): NativeCapabilityCore {
  const bridge = options.bridge ?? createNativeBridge(options);

  return {
    ...bridge,

    listMapApps() {
      return [...NATIVE_MAP_APPS];
    },

    async listMapOpenCandidates() {
      const results = await Promise.all(
        NATIVE_MAP_APPS.map(async (app) => {
          try {
            const status = await bridge.checkMapInstalled({ appType: app.appType });
            return {
              ...app,
              ...status,
              available: isMapCandidateAvailable(status),
            };
          } catch (error) {
            return {
              ...app,
              ok: false,
              appType: app.appType,
              installed: null,
              status: "unknown" as const,
              available: true,
              reason: normalizeErrorReason(error),
            };
          }
        }),
      );

      return results;
    },

    async openPreferredMapNavigation(input) {
      const requestedAppType = input.appType;
      const candidates = requestedAppType
        ? [{ appType: requestedAppType, label: requestedAppType }]
        : NATIVE_MAP_APPS;

      let lastReason = "";

      for (const candidate of candidates) {
        const status = await bridge.checkMapInstalled({
          appType: candidate.appType,
        });

        if (
          shouldSkipNativeMapCandidate(status, {
            userSelected: Boolean(requestedAppType),
          })
        ) {
          lastReason = status.reason ?? status.status;
          continue;
        }

        const result = await bridge.openMapNavigation({
          ...input,
          appType: candidate.appType,
          allowWebFallback: input.allowWebFallback ?? true,
        });

        if (result.ok) {
          return {
            ...result,
            appType: candidate.appType,
          };
        }

        lastReason = result.reason ?? status.reason ?? "map-open-failed";
      }

      return {
        ok: false,
        reason: lastReason || "no-map-candidate",
      };
    },

    async ensurePermission(input) {
      return bridge.ensurePermission(input);
    },

    async pickImages(input) {
      const requiredPermission = input?.capture ? "camera" : "photo-library";
      const permission = await bridge.ensurePermission({
        kind: requiredPermission,
        trigger: "on-demand",
        purpose: input?.capture ? "capture-image" : "pick-image",
      });

      if (!permission.ok) {
        return {
          ok: false,
          reason:
            permission.reason ??
            `${requiredPermission}-permission-denied`,
          files: [],
        };
      }

      return bridge.pickImages(input);
    },

    async scanBarcode(input) {
      const requiredPermission =
        input?.source === "image" ? "photo-library" : "camera";
      const permission = await bridge.ensurePermission({
        kind: requiredPermission,
        trigger: "on-demand",
        purpose: input?.source === "image" ? "scan-barcode-image" : "scan-barcode",
      });

      if (!permission.ok) {
        return {
          ok: false,
          reason:
            permission.reason ??
            `${requiredPermission}-permission-denied`,
          codes: [],
        };
      }

      return bridge.scanBarcode(input);
    },

    async showNotification(input) {
      return bridge.showNotification(input);
    },
  };
}

export const browserNativeBridge = createBrowserNativeBridge();
