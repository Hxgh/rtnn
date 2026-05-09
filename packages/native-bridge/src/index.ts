export const NATIVE_BRIDGE_VERSION = "0.1.0";

export type NativeRuntime = "browser" | "tauri";
export type NativeShell = "admin-desktop" | "app-mobile";
export type NativePlatform = "macos" | "windows" | "android" | "ios" | "web";
export type NativeChannel = "dev" | "testing" | "production";
export type NativeFeature =
  | "external.open"
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

export type NativeMapOpenCandidate = NativeMapAppInfo &
  NativeMapInstallResult & {
    available: boolean;
  };

export type NativeBridge = {
  getClientInfo(): Promise<NativeClientInfo>;
  openExternal(input: OpenExternalInput): Promise<NativeBridgeActionResult>;
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
};
type BrowserNotificationApi = {
  permission?: NotificationPermission | "default";
  requestPermission?: () =>
    | Promise<NotificationPermission | "default">
    | NotificationPermission
    | "default";
};
type AndroidMapBridge = {
  isAppInstalled?: (packageName: string) => boolean;
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
  setTimeout?: typeof setTimeout;
  clearTimeout?: typeof clearTimeout;
  addEventListener?: Window["addEventListener"];
  removeEventListener?: Window["removeEventListener"];
  Notification?: BrowserNotificationApi;
  AndroidMap?: AndroidMapBridge;
  AndroidTheme?: AndroidThemeBridge;
  __RTNN_SYSTEM_THEME__?: string;
  __ANDROID_SYSTEM_THEME__?: string;
  __TAURI__?: {
    core?: {
      invoke?: TauriInvoke;
    };
    invoke?: TauriInvoke;
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
  mapNavigationCommand?: string;
  checkMapInstalledCommand?: string;
  checkPermissionCommand?: string;
  requestPermissionCommand?: string;
  checkUpdateCommand?: string;
  installUpdateCommand?: string;
};

export type CreateDetectedTauriNativeBridgeOptions = {
  invoke: TauriInvoke;
  fallback?: NativeBridge;
  globalScope?: TauriGlobalScope;
  getClientInfoCommand?: string;
  openExternalCommand?: string;
  mapNavigationCommand?: string;
  checkMapInstalledCommand?: string;
  checkPermissionCommand?: string;
  requestPermissionCommand?: string;
  checkUpdateCommand?: string;
  installUpdateCommand?: string;
};

export type CreateNativeBridgeOptions = CreateBrowserNativeBridgeOptions & {
  globalScope?: TauriGlobalScope;
  invoke?: TauriInvoke;
  fallback?: NativeBridge;
  getClientInfoCommand?: string;
  openExternalCommand?: string;
  mapNavigationCommand?: string;
  checkMapInstalledCommand?: string;
  checkPermissionCommand?: string;
  requestPermissionCommand?: string;
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
const NATIVE_ANDROID_MAP_READY_EVENT = "rtnn:android-map-ready";

const NATIVE_MAP_ANDROID_PACKAGES: Record<MapAppType, string> = {
  amap: "com.autonavi.minimap",
  baidu: "com.baidu.BaiduMap",
  tencent: "com.tencent.map",
};
const ANDROID_MAP_BRIDGE_WAIT_MS = 1_600;
const ANDROID_MAP_BRIDGE_POLL_MS = 100;

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

  return {
    ok,
    kind: input.kind,
    status,
    requested: result.requested,
    canAskAgain: result.canAskAgain,
    message: result.message,
    reason: result.reason,
  };
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

  if (
    pickerManagedPermissionKinds.has(normalized.kind) &&
    normalized.purpose !== "standalone-camera"
  ) {
    return makePickerManagedPermissionResult(normalized, true);
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

    async openMapNavigation(input) {
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
      return pickImagesWithInput(input);
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
  if (error instanceof Error) {
    return error.message || "native-command-failed";
  }

  return String(error || "native-command-failed");
}

function normalizeActionResult(
  result: NativeBridgeActionResult | null | undefined,
): NativeBridgeActionResult {
  if (result && typeof result.ok === "boolean") {
    return result;
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
    reason: result.reason ?? undefined,
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
    reason: result.reason ?? undefined,
  };
}

function isMapCandidateAvailable(result: NativeMapInstallResult) {
  return result.status === "installed" || result.status === "unknown";
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
  const packageName = NATIVE_MAP_ANDROID_PACKAGES[appType];
  const isAppInstalled = globalScope?.AndroidMap?.isAppInstalled;

  if (!packageName || typeof isAppInstalled !== "function") {
    return null;
  }

  try {
    const installed = Boolean(isAppInstalled(packageName));

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

function shouldWaitForAndroidMapBridge(
  globalScope: TauriGlobalScope | undefined = getDefaultGlobalScope(),
) {
  return detectBrowserPlatform(globalScope?.navigator?.userAgent) === "android";
}

function waitForAndroidMapBridge(
  globalScope: TauriGlobalScope | undefined = getDefaultGlobalScope(),
): Promise<void> {
  if (
    globalScope?.AndroidMap?.isAppInstalled ||
    !shouldWaitForAndroidMapBridge(globalScope)
  ) {
    return Promise.resolve();
  }

  const setTimer = globalScope?.setTimeout ?? setTimeout;
  const clearTimer = globalScope?.clearTimeout ?? clearTimeout;
  const deadline = Date.now() + ANDROID_MAP_BRIDGE_WAIT_MS;

  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let completed = false;

    const finish = () => {
      if (completed) {
        return;
      }

      completed = true;
      if (timer) {
        clearTimer(timer);
      }
      globalScope?.removeEventListener?.(
        NATIVE_ANDROID_MAP_READY_EVENT,
        finish,
      );
      resolve();
    };

    const tick = () => {
      if (globalScope?.AndroidMap?.isAppInstalled || Date.now() >= deadline) {
        finish();
        return;
      }

      timer = setTimer(tick, ANDROID_MAP_BRIDGE_POLL_MS);
    };

    globalScope?.addEventListener?.(NATIVE_ANDROID_MAP_READY_EVENT, finish);
    tick();
  });
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

    async openMapNavigation(input) {
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
      if (androidResult) {
        return androidResult;
      }

      await waitForAndroidMapBridge(globalScope);

      const delayedAndroidResult = checkAndroidMapInstalledWithBridge(
        input.appType,
        globalScope,
      );
      if (delayedAndroidResult) {
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
      return fallback.pickImages(input);
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
  const features = options.features ?? ["external.open", "map.navigation"];

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

    async openMapNavigation(input) {
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
      if (androidResult) {
        return androidResult;
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
      return pickImagesWithInput(input);
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
    mapNavigationCommand: options.mapNavigationCommand,
    checkMapInstalledCommand: options.checkMapInstalledCommand,
    checkPermissionCommand: options.checkPermissionCommand,
    requestPermissionCommand: options.requestPermissionCommand,
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

        if (status.status === "not-installed" || status.status === "unsupported") {
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
  };
}

export const browserNativeBridge = createBrowserNativeBridge();
