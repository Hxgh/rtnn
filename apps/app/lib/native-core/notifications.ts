"use client";

import type { NativeBridge, NativeBridgeActionResult } from "@rtnn/native-bridge";
import { ensureActionPermissions } from "./permissions";

export async function showNotification(
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
    body: "你已开启客户端通知。",
    tag: "rtnn-device-service",
  });
}
