"use client";

import type { NativeBridge } from "@rtnn/native-bridge";
import { ensureActionPermissions } from "./permissions";
import type {
  NativeBarcodeScanActionResult,
  NativeBarcodeScanOptions,
} from "./types";

export async function scanBarcode(
  nativeBridge: NativeBridge,
  options: NativeBarcodeScanOptions = {},
): Promise<NativeBarcodeScanActionResult> {
  const action = "barcode.scan";
  const permissionResult = await ensureActionPermissions(nativeBridge, action);

  if (!permissionResult.ok) {
    return {
      ok: false,
      action,
      permissions: permissionResult.permissions,
      reason: permissionResult.reason,
      codes: [],
    };
  }

  const result = await nativeBridge.scanBarcode({
    source: options.source ?? "camera",
    formats: options.formats,
    timeoutMs: options.timeoutMs,
  });

  return {
    ...result,
    action,
    permissions: permissionResult.permissions,
  };
}
