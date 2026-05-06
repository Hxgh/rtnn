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

export type MapNavigationInput = {
  lat?: number;
  lng?: number;
  name?: string;
  appType?: MapAppType;
  directNav?: boolean;
};

export type NativeBridge = {
  getClientInfo(): Promise<NativeClientInfo>;
  openExternal(input: OpenExternalInput): Promise<NativeBridgeActionResult>;
  openMapNavigation(
    input: MapNavigationInput,
  ): Promise<NativeBridgeActionResult>;
  checkUpdate(): Promise<NativeUpdateCheckResult>;
  installUpdate(): Promise<NativeBridgeActionResult>;
};

export type TauriInvoke = <TResult = unknown>(
  command: string,
  args?: Record<string, unknown>,
) => Promise<TResult>;

type BrowserOpen = (url?: string, target?: string, features?: string) => unknown;

type TauriGlobalScope = {
  navigator?: {
    userAgent?: string;
  };
  open?: BrowserOpen;
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
  checkUpdateCommand?: string;
  installUpdateCommand?: string;
};

export type CreateDetectedTauriNativeBridgeOptions = {
  invoke: TauriInvoke;
  fallback?: NativeBridge;
  getClientInfoCommand?: string;
  openExternalCommand?: string;
  mapNavigationCommand?: string;
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
  checkUpdateCommand?: string;
  installUpdateCommand?: string;
};

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

export function buildWebMapNavigationUrl(input: MapNavigationInput) {
  const hasCoords =
    typeof input.lat === "number" && typeof input.lng === "number";
  const name = input.name?.trim();

  if (!hasCoords && !name) {
    return null;
  }

  const encodedName = encodeURIComponent(name || "目的地");

  if (hasCoords) {
    return `https://uri.amap.com/navigation?to=${input.lng},${input.lat},${encodedName}&mode=car`;
  }

  return `https://uri.amap.com/navigation?to=${encodedName}&mode=car`;
}

export function createBrowserNativeBridge(
  options: CreateBrowserNativeBridgeOptions = {},
): NativeBridge {
  return {
    async getClientInfo() {
      return {
        runtime: "browser",
        shell: null,
        platform: detectBrowserPlatform(options.userAgent),
        appVersion: null,
        bridgeVersion: NATIVE_BRIDGE_VERSION,
        channel: options.channel ?? "dev",
        sourceSha: options.sourceSha,
        features: [],
      };
    },

    async openExternal(input) {
      const opened = openBrowserUrl(input.url, input.target, options.open);
      return opened
        ? { ok: true }
        : { ok: false, reason: "browser-open-unavailable" };
    },

    async openMapNavigation(input) {
      const url = buildWebMapNavigationUrl(input);

      if (!url) {
        return { ok: false, reason: "missing-map-target" };
      }

      const opened = openBrowserUrl(url, "_blank", options.open);
      return opened
        ? { ok: true, message: "已打开网页版地图" }
        : { ok: false, reason: "browser-open-unavailable" };
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

export function createDetectedTauriNativeBridge(
  options: CreateDetectedTauriNativeBridgeOptions,
): NativeBridge {
  const fallback = options.fallback ?? createBrowserNativeBridge();

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
        },
      );

      return result ?? { ok: true };
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
    });
  const invoke = options.invoke ?? getTauriInvoke(options.globalScope);

  if (!invoke) {
    return fallback;
  }

  return createDetectedTauriNativeBridge({
    invoke,
    fallback,
    getClientInfoCommand: options.getClientInfoCommand,
    openExternalCommand: options.openExternalCommand,
    mapNavigationCommand: options.mapNavigationCommand,
    checkUpdateCommand: options.checkUpdateCommand,
    installUpdateCommand: options.installUpdateCommand,
  });
}

export const browserNativeBridge = createBrowserNativeBridge();
