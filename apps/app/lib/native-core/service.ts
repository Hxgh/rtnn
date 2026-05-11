"use client";

import {
  createNativeBridge,
  type NativeBridge,
} from "@rtnn/native-bridge";
import { scanBarcode } from "./barcode";
import { getMapCandidates, openMapNavigation } from "./map";
import { pickMedia } from "./media";
import { showNotification } from "./notifications";
import {
  checkPermissions,
  ensureActionPermissions,
  getActionPermissionKinds,
  getPermissionPolicy,
  prepareStartupPermissions,
  requestPermission,
} from "./permissions";
import { getRuntimeSnapshot } from "./runtime";
import { buildUpdateCheckQuery, checkAppUpdate } from "./updates";
import type { NativeCoreService } from "./types";

export function createAppNativeCore(
  nativeBridge: NativeBridge = createNativeBridge(),
): NativeCoreService {
  return {
    getRuntimeSnapshot() {
      return getRuntimeSnapshot(nativeBridge);
    },

    getMapCandidates() {
      return getMapCandidates(nativeBridge);
    },

    openExternalUrl(url) {
      return nativeBridge.openExternal({ url });
    },

    openInAppWebView(url) {
      return nativeBridge.openInAppWebView({ url });
    },

    openMapNavigation(input) {
      return openMapNavigation(nativeBridge, input);
    },

    checkPermissions(kinds) {
      return checkPermissions(nativeBridge, kinds);
    },

    requestPermission(kind) {
      return requestPermission(nativeBridge, kind);
    },

    getPermissionPolicy,

    getActionPermissionKinds,

    ensureActionPermissions(action) {
      return ensureActionPermissions(nativeBridge, action);
    },

    prepareStartupPermissions(mode) {
      return prepareStartupPermissions(nativeBridge, mode);
    },

    pickMedia(source, options) {
      return pickMedia(nativeBridge, source, options);
    },

    scanBarcode(options) {
      return scanBarcode(nativeBridge, options);
    },

    showNotification() {
      return showNotification(nativeBridge);
    },

    buildUpdateCheckQuery() {
      return buildUpdateCheckQuery(nativeBridge);
    },

    checkAppUpdate(options) {
      return checkAppUpdate(nativeBridge, options);
    },

    openUrl(url) {
      return nativeBridge.openInAppWebView({ url });
    },
  };
}
