"use client";

import { useEffect } from "react";
import { installNativeViewportInsets } from "@rtnn/native-bridge";

export function NativeRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => installNativeViewportInsets(), []);

  return children;
}
