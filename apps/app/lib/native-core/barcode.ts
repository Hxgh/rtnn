"use client";

import type { NativeBridge } from "@rtnn/native-bridge";
import { ensureActionPermissions } from "./permissions";
import type {
  NativeBarcodeScanActionResult,
  NativeBarcodeScanOptions,
} from "./types";

const defaultBarcodeFormats = [
  "qr_code",
  "aztec",
  "codabar",
  "code_39",
  "code_93",
  "code_128",
  "data_matrix",
  "ean_8",
  "ean_13",
  "itf",
  "pdf417",
  "upc_a",
  "upc_e",
];

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
    formats: options.formats ?? defaultBarcodeFormats,
    timeoutMs: options.timeoutMs,
  });

  return {
    ...result,
    action,
    permissions: permissionResult.permissions,
  };
}
