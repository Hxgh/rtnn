"use client";

import {
  createNativeBridge,
  hasNativeFeature,
  NATIVE_MAP_APPS,
  type MapAppType,
  type NativeFeature,
  type NativeBridge,
  type NativeClientUpdateQuery,
  type NativeBridgeActionResult,
  type NativeClientInfo,
  type NativeMapOpenCandidate,
  type NativeMapInstallResult,
  type NativePermissionKind,
  type NativePermissionResult,
  type NativePermissionTrigger,
  type NativePickedFile,
  resolveNativeClientUpdateQuery,
  installNativeViewportInsets,
} from "@rtnn/native-bridge";
import type { ClientUpdateCheckInfo } from "@rtnn/shared-types";

export type {
  MapAppType as NativeCoreMapAppType,
  NativeBridgeActionResult as NativeCoreActionResult,
  NativeClientInfo as NativeCoreClientInfo,
  NativeMapOpenCandidate as NativeCoreMapCandidate,
  NativePermissionKind as NativeCorePermissionKind,
  NativePermissionResult as NativeCorePermissionResult,
  NativePickedFile as NativeCorePickedFile,
} from "@rtnn/native-bridge";

export type NativeMediaSource = "album" | "camera";
export type NativePermissionAction =
  | "media.pick-album"
  | "media.capture-camera"
  | "notification.enable"
  | "location.use"
  | "map.navigation"
  | "external.open"
  | "client-update.check";
export type NativePermissionRequestTiming =
  | "on-user-action"
  | "manual-diagnostics"
  | "never";

export type NativePermissionPolicy = {
  action: NativePermissionAction;
  requestTiming: NativePermissionRequestTiming;
  trigger: NativePermissionTrigger;
  permissions: Array<{
    kind: NativePermissionKind;
    purpose: string;
    required: boolean;
  }>;
};

export type NativeActionPermissionResult = NativeBridgeActionResult & {
  action: NativePermissionAction;
  permissions: NativePermissionResult[];
};

export type NativeRuntimeSnapshot = {
  clientInfo: NativeClientInfo;
  capabilities: {
    externalOpen: boolean;
    mapNavigation: boolean;
    filePick: boolean;
  };
};

export type NativeMediaPickResult = NativeBridgeActionResult & {
  action: Extract<NativePermissionAction, "media.pick-album" | "media.capture-camera">;
  files: NativePickedFile[];
  permissions: NativePermissionResult[];
  source: NativeMediaSource;
};

export type NativePermissionSnapshot = Record<
  NativePermissionKind,
  NativePermissionResult | null
>;

export type NativeCoreService = {
  getRuntimeSnapshot(): Promise<NativeRuntimeSnapshot>;
  getMapCandidates(): Promise<NativeMapOpenCandidate[]>;
  openExternalUrl(url: string): Promise<NativeBridgeActionResult>;
  openMapNavigation(input: {
    appType?: MapAppType;
    lat?: number;
    lng?: number;
    name?: string;
  }): Promise<NativeBridgeActionResult & { appType?: MapAppType }>;
  checkPermissions(kinds: NativePermissionKind[]): Promise<NativePermissionSnapshot>;
  requestPermissionForDiagnostics(
    kind: NativePermissionKind,
  ): Promise<NativePermissionResult>;
  getPermissionPolicy(action: NativePermissionAction): NativePermissionPolicy;
  getActionPermissionKinds(action: NativePermissionAction): NativePermissionKind[];
  ensureActionPermissions(
    action: NativePermissionAction,
  ): Promise<NativeActionPermissionResult>;
  pickMedia(source: NativeMediaSource): Promise<NativeMediaPickResult>;
  buildUpdateCheckQuery(): Promise<NativeClientUpdateQuery | null>;
  checkAppUpdate(): Promise<ClientUpdateCheckInfo | null>;
  openUrl(url: string): Promise<NativeBridgeActionResult>;
};

export function installAppNativeViewportInsets() {
  return installNativeViewportInsets();
}

const nativePermissionPolicies = {
  "media.pick-album": {
    action: "media.pick-album",
    requestTiming: "on-user-action",
    trigger: "on-demand",
    permissions: [
      {
        kind: "photo-library",
        purpose: "pick-image",
        required: true,
      },
    ],
  },
  "media.capture-camera": {
    action: "media.capture-camera",
    requestTiming: "on-user-action",
    trigger: "on-demand",
    permissions: [
      {
        kind: "camera",
        purpose: "capture-image",
        required: true,
      },
    ],
  },
  "notification.enable": {
    action: "notification.enable",
    requestTiming: "on-user-action",
    trigger: "on-demand",
    permissions: [
      {
        kind: "notification",
        purpose: "enable-notification",
        required: true,
      },
    ],
  },
  "location.use": {
    action: "location.use",
    requestTiming: "on-user-action",
    trigger: "on-demand",
    permissions: [
      {
        kind: "location",
        purpose: "use-location",
        required: true,
      },
    ],
  },
  "map.navigation": {
    action: "map.navigation",
    requestTiming: "never",
    trigger: "manual",
    permissions: [],
  },
  "external.open": {
    action: "external.open",
    requestTiming: "never",
    trigger: "manual",
    permissions: [],
  },
  "client-update.check": {
    action: "client-update.check",
    requestTiming: "never",
    trigger: "manual",
    permissions: [],
  },
} satisfies Record<NativePermissionAction, NativePermissionPolicy>;

function canUseNativeFeature(
  info: NativeClientInfo,
  feature: NativeFeature,
) {
  return info.runtime === "browser" || hasNativeFeature(info, feature);
}

function isMapCandidateAvailable(result: NativeMapInstallResult) {
  return result.status === "installed" || result.status === "unknown";
}

function normalizeNativeError(error: unknown) {
  return error instanceof Error
    ? error.message || "native-action-failed"
    : String(error || "native-action-failed");
}

function getMediaAction(source: NativeMediaSource) {
  return source === "camera" ? "media.capture-camera" : "media.pick-album";
}

export function createAppNativeCore(
  nativeBridge: NativeBridge = createNativeBridge(),
): NativeCoreService {
  return {
    async getRuntimeSnapshot() {
      const clientInfo = await nativeBridge.getClientInfo();

      return {
        clientInfo,
        capabilities: {
          externalOpen: canUseNativeFeature(clientInfo, "external.open"),
          mapNavigation: canUseNativeFeature(clientInfo, "map.navigation"),
          filePick: canUseNativeFeature(clientInfo, "file.pick"),
        },
      };
    },

    async getMapCandidates() {
      return Promise.all(
        NATIVE_MAP_APPS.map(async (app) => {
          try {
            const status = await nativeBridge.checkMapInstalled({
              appType: app.appType,
            });

            return {
              ...app,
              ...status,
              available: isMapCandidateAvailable(status),
            };
          } catch (error) {
            return {
              ...app,
              ok: true,
              installed: null,
              status: "unknown" as const,
              available: true,
              reason: normalizeNativeError(error),
            };
          }
        }),
      );
    },

    async openExternalUrl(url) {
      return nativeBridge.openExternal({ url });
    },

    async openMapNavigation(input) {
      const candidates = input.appType
        ? NATIVE_MAP_APPS.filter((item) => item.appType === input.appType)
        : NATIVE_MAP_APPS;
      let lastReason = "";

      for (const candidate of candidates) {
        const status = await nativeBridge.checkMapInstalled({
          appType: candidate.appType,
        });

        if (status.status === "not-installed" || status.status === "unsupported") {
          lastReason = status.reason ?? status.status;
          continue;
        }

        const result = await nativeBridge.openMapNavigation({
          ...input,
          appType: candidate.appType,
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

    async checkPermissions(kinds) {
      const pairs = await Promise.all(
        kinds.map(async (kind) => [
          kind,
          await nativeBridge.checkPermission({ kind, trigger: "manual" }),
        ] as const),
      );

      return Object.fromEntries(pairs) as NativePermissionSnapshot;
    },

    async requestPermissionForDiagnostics(kind) {
      return nativeBridge.ensurePermission({
        kind,
        trigger: "manual",
        purpose: "native-diagnostics",
      });
    },

    getPermissionPolicy(action) {
      return nativePermissionPolicies[action];
    },

    getActionPermissionKinds(action) {
      return this.getPermissionPolicy(action).permissions.map((item) => item.kind);
    },

    async ensureActionPermissions(action) {
      const policy = this.getPermissionPolicy(action);
      const permissions: NativePermissionResult[] = [];

      if (policy.requestTiming !== "on-user-action") {
        return {
          ok: true,
          action,
          permissions,
        };
      }

      for (const item of policy.permissions) {
        const result = await nativeBridge.ensurePermission({
          kind: item.kind,
          trigger: policy.trigger,
          purpose: item.purpose,
        });

        permissions.push(result);

        if (item.required && !result.ok) {
          return {
            ok: false,
            action,
            permissions,
            reason: result.reason ?? `${item.kind}-permission-denied`,
          };
        }
      }

      return {
        ok: true,
        action,
        permissions,
      };
    },

    async pickMedia(source) {
      const action = getMediaAction(source);
      const permissionResult = await this.ensureActionPermissions(action);

      if (!permissionResult.ok) {
        return {
          ok: false,
          action,
          files: [],
          permissions: permissionResult.permissions,
          reason: permissionResult.reason,
          source,
        };
      }

      const result = await nativeBridge.pickImages(
        source === "camera"
          ? {
              accept: "image/*",
              capture: "environment",
              maxFiles: 1,
              multiple: false,
              readAsDataUrl: true,
            }
          : {
              accept: "image/*",
              maxFiles: 3,
              multiple: true,
              readAsDataUrl: true,
            },
      );

      return {
        ...result,
        action,
        permissions: permissionResult.permissions,
        source,
      };
    },

    async buildUpdateCheckQuery() {
      const info = await nativeBridge.getClientInfo();
      return resolveNativeClientUpdateQuery(info);
    },

    async checkAppUpdate() {
      const query = await this.buildUpdateCheckQuery();

      if (!query) {
        return null;
      }

      const params = new URLSearchParams({
        client: query.client,
        target: query.target,
        channel: query.channel,
      });

      if (query.currentVersion) {
        params.set("currentVersion", query.currentVersion);
      }

      const response = await fetch(`/api/client-updates/check?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("client-update-check-failed");
      }

      return (await response.json()) as ClientUpdateCheckInfo;
    },

    async openUrl(url) {
      return nativeBridge.openExternal({ url });
    },
  };
}
