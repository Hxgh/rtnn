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

function detectBrowserPlatform(): NativePlatform {
  if (typeof navigator === "undefined") {
    return "web";
  }

  const userAgent = navigator.userAgent.toLowerCase();

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

function openBrowserUrl(url: string, target: "_blank" | "_self" = "_blank") {
  const opener = (
    globalThis as typeof globalThis & {
      open?: (url?: string, target?: string, features?: string) => unknown;
    }
  ).open;

  if (typeof opener !== "function") {
    return false;
  }

  opener(url, target, "noopener,noreferrer");
  return true;
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
  options: Partial<Pick<NativeClientInfo, "channel" | "sourceSha">> = {},
): NativeBridge {
  return {
    async getClientInfo() {
      return {
        runtime: "browser",
        shell: null,
        platform: detectBrowserPlatform(),
        appVersion: null,
        bridgeVersion: NATIVE_BRIDGE_VERSION,
        channel: options.channel ?? "dev",
        sourceSha: options.sourceSha,
        features: [],
      };
    },

    async openExternal(input) {
      const opened = openBrowserUrl(input.url, input.target);
      return opened
        ? { ok: true }
        : { ok: false, reason: "browser-open-unavailable" };
    },

    async openMapNavigation(input) {
      const url = buildWebMapNavigationUrl(input);

      if (!url) {
        return { ok: false, reason: "missing-map-target" };
      }

      const opened = openBrowserUrl(url);
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

export const browserNativeBridge = createBrowserNativeBridge();
