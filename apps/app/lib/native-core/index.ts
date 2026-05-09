"use client";

export { createAppNativeCore } from "./service";
export {
  isNativeActionCancelled,
  nativeActionWatchdogMs,
  runNativeActionWithWatchdog,
} from "./actions";
export { isMapDetectionUncertain } from "./map";
export { installAppNativeViewportInsets } from "./runtime";
export {
  installAppNativeThemeListener,
  resolveAppResolvedTheme,
  syncAppNativeTheme,
} from "./theme";

export type {
  NativeActionPermissionResult,
  NativeCoreService,
  NativeMapNavigationInput,
  NativeMediaPickOptions,
  NativeMediaPickResult,
  NativeMediaSource,
  NativePermissionAction,
  NativePermissionPolicy,
  NativePermissionRequestTiming,
  NativePermissionSnapshot,
  NativeRuntimeSnapshot,
} from "./types";

export type {
  MapAppType as NativeCoreMapAppType,
  NativeBridgeActionResult as NativeCoreActionResult,
  NativeClientInfo as NativeCoreClientInfo,
  NativeMapOpenCandidate as NativeCoreMapCandidate,
  NativePermissionKind as NativeCorePermissionKind,
  NativePermissionResult as NativeCorePermissionResult,
  NativePickedFile as NativeCorePickedFile,
} from "@rtnn/native-bridge";
