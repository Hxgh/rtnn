"use client";

import { useEffect } from "react";
import {
  createAppNativeCore,
  installAppNativeViewportInsets,
  type NativePermissionStartupMode,
} from "@/lib/native-core";

const startupPermissionMode = normalizeStartupPermissionMode(
  process.env.NEXT_PUBLIC_APP_NATIVE_STARTUP_PERMISSIONS,
);

function normalizeStartupPermissionMode(
  value?: string,
): NativePermissionStartupMode {
  if (value === "disabled") {
    return value;
  }

  return "check-only";
}

export function NativeRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => installAppNativeViewportInsets(), []);

  useEffect(() => {
    if (startupPermissionMode === "disabled") {
      return;
    }

    const nativeCore = createAppNativeCore();
    void nativeCore.prepareStartupPermissions(startupPermissionMode).catch(() => {});
  }, []);

  return children;
}
