"use client";

import {
  createNativeCapabilityCore,
  hasNativeFeature,
  type MapAppType,
  type NativeFeature,
  type NativeClientUpdateQuery,
  type NativeBridgeActionResult,
  type NativeCapabilityCore,
  type NativeClientInfo,
  type NativeMapOpenCandidate,
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

export type NativePermissionPolicy = {
  action: NativePermissionAction;
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
  files: NativePickedFile[];
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
  ensurePermission(kind: NativePermissionKind): Promise<NativePermissionResult>;
  getPermissionPolicy(action: NativePermissionAction): NativePermissionPolicy;
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
    trigger: "manual",
    permissions: [],
  },
  "external.open": {
    action: "external.open",
    trigger: "manual",
    permissions: [],
  },
  "client-update.check": {
    action: "client-update.check",
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

export function createAppNativeCore(
  nativeCore: NativeCapabilityCore = createNativeCapabilityCore(),
): NativeCoreService {
  return {
    async getRuntimeSnapshot() {
      const clientInfo = await nativeCore.getClientInfo();

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
      return nativeCore.listMapOpenCandidates();
    },

    async openExternalUrl(url) {
      return nativeCore.openExternal({ url });
    },

    async openMapNavigation(input) {
      return nativeCore.openPreferredMapNavigation(input);
    },

    async checkPermissions(kinds) {
      const pairs = await Promise.all(
        kinds.map(async (kind) => [
          kind,
          await nativeCore.checkPermission({ kind, trigger: "manual" }),
        ] as const),
      );

      return Object.fromEntries(pairs) as NativePermissionSnapshot;
    },

    async ensurePermission(kind) {
      return nativeCore.ensurePermission({
        kind,
        trigger: "on-demand",
      });
    },

    getPermissionPolicy(action) {
      return nativePermissionPolicies[action];
    },

    async ensureActionPermissions(action) {
      const policy = this.getPermissionPolicy(action);
      const permissions = [];

      for (const item of policy.permissions) {
        const result = await nativeCore.ensurePermission({
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
      const result = await nativeCore.pickImages(
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
        source,
      };
    },

    async buildUpdateCheckQuery() {
      const info = await nativeCore.getClientInfo();
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
      return nativeCore.openExternal({ url });
    },
  };
}
