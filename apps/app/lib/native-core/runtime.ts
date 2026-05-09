"use client";

import {
  hasNativeFeature,
  installNativeViewportInsets,
  type NativeBridge,
  type NativeClientInfo,
  type NativeFeature,
} from "@rtnn/native-bridge";
import type { NativeRuntimeSnapshot } from "./types";

function canUseNativeFeature(info: NativeClientInfo, feature: NativeFeature) {
  return info.runtime === "browser" || hasNativeFeature(info, feature);
}

export function installAppNativeViewportInsets() {
  return installNativeViewportInsets();
}

export async function getRuntimeSnapshot(
  nativeBridge: NativeBridge,
): Promise<NativeRuntimeSnapshot> {
  const clientInfo = await nativeBridge.getClientInfo();

  return {
    clientInfo,
    capabilities: {
      externalOpen: canUseNativeFeature(clientInfo, "external.open"),
      mapNavigation: canUseNativeFeature(clientInfo, "map.navigation"),
      filePick: canUseNativeFeature(clientInfo, "file.pick"),
      notification: canUseNativeFeature(clientInfo, "notification"),
      barcodeScan: canUseNativeFeature(clientInfo, "barcode.scan"),
      safeArea: canUseNativeFeature(clientInfo, "safe-area"),
      keyboard: canUseNativeFeature(clientInfo, "keyboard"),
      updater: canUseNativeFeature(clientInfo, "updater"),
    },
  };
}
