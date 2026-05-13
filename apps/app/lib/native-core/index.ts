"use client";

export { createAppNativeCore } from "./service";
export type { NativePermissionStartupMode } from "./permissions";
export {
  isNativeActionCancelled,
  nativeActionReturnSettleMs,
  nativeActionWatchdogMs,
  runNativeActionWithWatchdog,
} from "./actions";
export { isMapDetectionUncertain } from "./map";
export {
  buildInAppWebViewUrl,
  navigateToInAppWebView,
} from "./webview";
export {
  barcodeScanFormats,
  clearScanner,
  createHtml5QrcodeScanner,
  getScannerBoxSize,
  normalizeBarcodeValue,
  normalizeWebBarcodeResult,
  scanBarcodeImageFile,
  scannerElementId,
  stopHtml5QrcodeScanner,
  type WebBarcodeScanResult,
} from "./scanner";
export { installAppNativeViewportInsets } from "./runtime";
export {
  installAppNativeThemeListener,
  resolveAppResolvedTheme,
  syncAppNativeTheme,
} from "./theme";

export type {
  NativeActionPermissionResult,
  NativeBarcodeScanActionResult,
  NativeBarcodeScanOptions,
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
  NativeBarcode as NativeCoreBarcode,
  NativeClientInfo as NativeCoreClientInfo,
  NativeMapOpenCandidate as NativeCoreMapCandidate,
  NativePermissionKind as NativeCorePermissionKind,
  NativePermissionResult as NativeCorePermissionResult,
  NativePickedFile as NativeCorePickedFile,
} from "@rtnn/native-bridge";
