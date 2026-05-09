"use client";

import type { NativeBridgeActionResult } from "@rtnn/native-bridge";

export const nativeActionWatchdogMs = 4_000;

export type NativeActionRunResult = NativeBridgeActionResult & {
  dispatched?: boolean;
};

export function isNativeActionCancelled(result: NativeBridgeActionResult) {
  return (
    result.reason === "file-picker-cancelled" ||
    result.reason === "file-picker-timeout"
  );
}

export async function runNativeActionWithWatchdog(
  action: () => Promise<NativeBridgeActionResult>,
  timeoutMs = nativeActionWatchdogMs,
): Promise<NativeActionRunResult> {
  return Promise.race([
    action(),
    new Promise<NativeActionRunResult>((resolve) => {
      window.setTimeout(
        () =>
          resolve({
            ok: true,
            dispatched: true,
            reason: "native-action-dispatched",
          }),
        timeoutMs,
      );
    }),
  ]);
}
