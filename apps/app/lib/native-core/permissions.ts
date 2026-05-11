"use client";

import type {
  NativeBridge,
  NativePermissionKind,
  NativePermissionResult,
} from "@rtnn/native-bridge";
import type {
  NativeActionPermissionResult,
  NativePermissionAction,
  NativePermissionPolicy,
  NativePermissionSnapshot,
} from "./types";

export type NativePermissionStartupMode = "disabled" | "check-only" | "request";

const startupPermissionKinds: NativePermissionKind[] = [
  "camera",
  "photo-library",
  "notification",
];
const pickerManagedPermissionKinds = new Set<NativePermissionKind>([
  "photo-library",
  "file-picker",
]);

const pickerManagedPermissionActions = new Set<NativePermissionAction>([
  "media.pick-album",
  "barcode.scan-image",
]);

export const nativePermissionPolicies = {
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
  "barcode.scan": {
    action: "barcode.scan",
    requestTiming: "on-user-action",
    trigger: "on-demand",
    permissions: [
      {
        kind: "camera",
        purpose: "scan-barcode",
        required: true,
      },
    ],
  },
  "barcode.scan-image": {
    action: "barcode.scan-image",
    requestTiming: "on-user-action",
    trigger: "on-demand",
    permissions: [
      {
        kind: "photo-library",
        purpose: "scan-barcode-image",
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

export function getStartupPermissionKinds() {
  return [...startupPermissionKinds];
}

export function getPermissionPolicy(action: NativePermissionAction) {
  return nativePermissionPolicies[action];
}

export function getActionPermissionKinds(action: NativePermissionAction) {
  return getPermissionPolicy(action).permissions.map((item) => item.kind);
}

export async function checkPermissions(
  nativeBridge: NativeBridge,
  kinds: NativePermissionKind[],
): Promise<NativePermissionSnapshot> {
  const pairs = await Promise.all(
    kinds.map(
      async (kind) =>
        [
          kind,
          await nativeBridge.checkPermission({ kind, trigger: "manual" }),
        ] as const,
    ),
  );

  return Object.fromEntries(pairs) as NativePermissionSnapshot;
}

export function requestPermission(
  nativeBridge: NativeBridge,
  kind: NativePermissionKind,
): Promise<NativePermissionResult> {
  return nativeBridge.requestPermission({
    kind,
    trigger: "manual",
    purpose: "device-service",
  });
}

export async function ensureActionPermissions(
  nativeBridge: NativeBridge,
  action: NativePermissionAction,
): Promise<NativeActionPermissionResult> {
  const policy = getPermissionPolicy(action);
  const permissions: NativePermissionResult[] = [];

  if (policy.requestTiming !== "on-user-action") {
    return {
      ok: true,
      action,
      permissions,
    };
  }

  for (const item of policy.permissions) {
    if (
      pickerManagedPermissionKinds.has(item.kind) &&
      pickerManagedPermissionActions.has(action)
    ) {
      const result = await nativeBridge.checkPermission({
        kind: item.kind,
        trigger: policy.trigger,
        purpose: item.purpose,
      });

      permissions.push(result);
      continue;
    }

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
}

export async function prepareStartupPermissions(
  nativeBridge: NativeBridge,
  mode: NativePermissionStartupMode = "check-only",
): Promise<NativePermissionSnapshot> {
  if (mode === "disabled") {
    return {} as NativePermissionSnapshot;
  }

  const pairs = await Promise.all(
    startupPermissionKinds.map(async (kind) => {
      const result =
        mode === "request"
          ? await nativeBridge.ensurePermission({
              kind,
              trigger: "startup",
              purpose: "app-startup",
            })
          : await nativeBridge.checkPermission({
              kind,
              trigger: "startup",
              purpose: "app-startup-check",
            });

      return [kind, result] as const;
    }),
  );

  return Object.fromEntries(pairs) as NativePermissionSnapshot;
}
