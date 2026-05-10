"use client";

import type { NativeBridge, NativeBridgeActionResult } from "@rtnn/native-bridge";
import { ensureActionPermissions } from "./permissions";

export async function showTestNotification(
  nativeBridge: NativeBridge,
): Promise<NativeBridgeActionResult> {
  const permissionResult = await ensureActionPermissions(
    nativeBridge,
    "notification.enable",
  );

  if (!permissionResult.ok) {
    return {
      ok: false,
      reason: permissionResult.reason ?? "notification-permission-denied",
    };
  }

  return nativeBridge.showNotification({
    title: "RTNN",
    body: "通知能力已触发。",
    tag: "rtnn-native-diagnostics",
  });
}
