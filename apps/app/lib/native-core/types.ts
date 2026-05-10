"use client";

import type {
  MapAppType,
  NativeBridge,
  NativeBridgeActionResult,
  NativeBarcode,
  NativeBarcodeScanResult,
  NativeClientInfo,
  NativeClientUpdateQuery,
  NativeMapOpenCandidate,
  NativePermissionKind,
  NativePermissionResult,
  NativePermissionTrigger,
  NativePickedFile,
} from "@rtnn/native-bridge";
import type { ClientUpdateCheckInfo } from "@rtnn/shared-types";

export type NativeMediaSource = "album" | "camera";

export type NativePermissionAction =
  | "media.pick-album"
  | "media.capture-camera"
  | "notification.enable"
  | "barcode.scan"
  | "location.use"
  | "map.navigation"
  | "external.open"
  | "client-update.check";

export type NativePermissionRequestTiming =
  | "startup"
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
    notification: boolean;
    barcodeScan: boolean;
    safeArea: boolean;
    keyboard: boolean;
    updater: boolean;
  };
};

export type NativeMediaPickResult = NativeBridgeActionResult & {
  action: Extract<
    NativePermissionAction,
    "media.pick-album" | "media.capture-camera"
  >;
  files: NativePickedFile[];
  permissions: NativePermissionResult[];
  source: NativeMediaSource;
};

export type NativeMediaPickOptions = {
  timeoutMs?: number;
};

export type NativeBarcodeScanOptions = {
  timeoutMs?: number;
  formats?: string[];
  source?: "camera" | "image";
};

export type NativeBarcodeScanActionResult = NativeBarcodeScanResult & {
  action: Extract<NativePermissionAction, "barcode.scan">;
  permissions: NativePermissionResult[];
  codes: NativeBarcode[];
};

export type NativePermissionSnapshot = Record<
  NativePermissionKind,
  NativePermissionResult | null
>;

export type NativeMapNavigationInput = {
  appType?: MapAppType;
  lat?: number;
  lng?: number;
  name?: string;
  allowWebFallback?: boolean;
};

export type NativeCoreService = {
  getRuntimeSnapshot(): Promise<NativeRuntimeSnapshot>;
  getMapCandidates(): Promise<NativeMapOpenCandidate[]>;
  openExternalUrl(url: string): Promise<NativeBridgeActionResult>;
  openMapNavigation(
    input: NativeMapNavigationInput,
  ): Promise<NativeBridgeActionResult & { appType?: MapAppType }>;
  checkPermissions(
    kinds: NativePermissionKind[],
  ): Promise<NativePermissionSnapshot>;
  requestPermissionForDiagnostics(
    kind: NativePermissionKind,
  ): Promise<NativePermissionResult>;
  getPermissionPolicy(action: NativePermissionAction): NativePermissionPolicy;
  getActionPermissionKinds(
    action: NativePermissionAction,
  ): NativePermissionKind[];
  ensureActionPermissions(
    action: NativePermissionAction,
  ): Promise<NativeActionPermissionResult>;
  prepareStartupPermissions(
    mode?: "disabled" | "check-only" | "request",
  ): Promise<NativePermissionSnapshot>;
  pickMedia(
    source: NativeMediaSource,
    options?: NativeMediaPickOptions,
  ): Promise<NativeMediaPickResult>;
  scanBarcode(
    options?: NativeBarcodeScanOptions,
  ): Promise<NativeBarcodeScanActionResult>;
  showTestNotification(): Promise<NativeBridgeActionResult>;
  buildUpdateCheckQuery(): Promise<NativeClientUpdateQuery | null>;
  checkAppUpdate(options?: {
    currentVersion?: string;
  }): Promise<ClientUpdateCheckInfo | null>;
  openUrl(url: string): Promise<NativeBridgeActionResult>;
};

export type NativeCoreFactory = (bridge?: NativeBridge) => NativeCoreService;
