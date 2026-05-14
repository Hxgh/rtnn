"use client";

import type { NativeBridge } from "@rtnn/native-bridge";
import { ensureActionPermissions } from "./permissions";
import type {
  NativeMediaPickOptions,
  NativeMediaPickResult,
  NativeMediaSource,
} from "./types";

function getMediaAction(source: NativeMediaSource) {
  return source === "camera" ? "media.capture-camera" : "media.pick-album";
}

function getMediaPickerInput(
  source: NativeMediaSource,
  options: NativeMediaPickOptions,
) {
  if (source === "camera") {
    return {
      accept: "image/*",
      capture: "environment" as const,
      maxFiles: options.maxFiles ?? 1,
      multiple: false,
      readAsDataUrl: options.readAsDataUrl ?? true,
      timeoutMs: options.timeoutMs,
    };
  }

  return {
    accept: "image/*",
    maxFiles: options.maxFiles ?? 9,
    multiple: options.multiple ?? true,
    readAsDataUrl: options.readAsDataUrl ?? true,
    timeoutMs: options.timeoutMs,
  };
}

export async function pickMedia(
  nativeBridge: NativeBridge,
  source: NativeMediaSource,
  options: NativeMediaPickOptions = {},
): Promise<NativeMediaPickResult> {
  const action = getMediaAction(source);
  const permissionResult = await ensureActionPermissions(nativeBridge, action);

  if (!permissionResult.ok) {
    return {
      ok: false,
      action,
      files: [],
      permissions: permissionResult.permissions,
      reason: permissionResult.reason,
      source,
    };
  }

  const result = await nativeBridge.pickImages(
    getMediaPickerInput(source, options),
  );

  return {
    ...result,
    action,
    permissions: permissionResult.permissions,
    source,
  };
}
