"use client";

export { createAppNativeCore } from "./service";
export type { NativePermissionStartupMode } from "./permissions";
export {
  useBarcodeScanner,
  type BarcodeImageScanState,
  type BarcodeScannerState,
  type UseBarcodeScannerOptions,
  type UseBarcodeScannerReturn,
} from "./use-barcode-scanner";
export {
  createUnavailableMapCandidates,
  getVisibleMapCandidates,
  isMapCandidateActionable,
  sortMapCandidates,
  useMapNavigation,
  type MapNavigationActionState,
  type MapNavigationPickerState,
  type UseMapNavigationOptions,
  type UseMapNavigationReturn,
} from "./use-map-navigation";
export {
  useMediaPicker,
  type MediaPickerState,
  type UseMediaPickerOptions,
  type UseMediaPickerReturn,
} from "./use-media-picker";
export {
  useNotificationAction,
  type NotificationActionState,
  type UseNotificationActionOptions,
  type UseNotificationActionReturn,
} from "./use-notification-action";
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
  shouldFallbackBarcodeScanToWeb,
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
