"use client";

import {
  createNativeBridge,
  type NativeBridge,
} from "@rtnn/native-bridge";
import { scanBarcode } from "./barcode";
import { getMapCandidates, openMapNavigation } from "./map";
import { pickMedia } from "./media";
import { showTestNotification } from "./notifications";
import {
  checkPermissions,
  ensureActionPermissions,
  getActionPermissionKinds,
  getPermissionPolicy,
  requestPermissionForDiagnostics,
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

    openMapNavigation(input) {
      return openMapNavigation(nativeBridge, input);
    },

    checkPermissions(kinds) {
      return checkPermissions(nativeBridge, kinds);
    },

    requestPermissionForDiagnostics(kind) {
      return requestPermissionForDiagnostics(nativeBridge, kind);
    },

    getPermissionPolicy,

    getActionPermissionKinds,

    ensureActionPermissions(action) {
      return ensureActionPermissions(nativeBridge, action);
    },

    pickMedia(source, options) {
      return pickMedia(nativeBridge, source, options);
    },

    scanBarcode(options) {
      return scanBarcode(nativeBridge, options);
    },

    showTestNotification() {
      return showTestNotification(nativeBridge);
    },

    buildUpdateCheckQuery() {
      return buildUpdateCheckQuery(nativeBridge);
    },

    checkAppUpdate(options) {
      return checkAppUpdate(nativeBridge, options);
    },

    openUrl(url) {
      return nativeBridge.openExternal({ url });
    },
  };
}
