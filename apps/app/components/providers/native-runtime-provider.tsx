"use client";

import { useEffect } from "react";
import { installAppNativeViewportInsets } from "@/lib/native-core";

export function NativeRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => installAppNativeViewportInsets(), []);

  return children;
}
