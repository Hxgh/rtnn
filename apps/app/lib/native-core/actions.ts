"use client";

import type { NativeBridgeActionResult } from "@rtnn/native-bridge";

export const nativeActionWatchdogMs = 4_000;
export const nativeActionReturnSettleMs = 500;

export type NativeActionRunResult = NativeBridgeActionResult & {
  dispatched?: boolean;
};

export function isNativeActionCancelled(result: NativeBridgeActionResult) {
  return (
    result.reason === "file-picker-cancelled" ||
    result.reason === "file-picker-timeout" ||
    result.reason === "barcode-scan-cancelled" ||
    result.reason === "scan-cancelled" ||
    result.reason === "cancelled" ||
    result.reason === "canceled"
  );
}

export async function runNativeActionWithWatchdog(
  action: () => Promise<NativeBridgeActionResult>,
  timeoutMs = nativeActionWatchdogMs,
): Promise<NativeActionRunResult> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return action();
  }

  return new Promise<NativeActionRunResult>((resolve, reject) => {
    let completed = false;
    let leftPage = false;
    let timer: number | null = null;
    let settleTimer: number | null = null;

    const cleanup = () => {
      if (timer) {
        window.clearTimeout(timer);
      }
      if (settleTimer) {
        window.clearTimeout(settleTimer);
      }
      window.removeEventListener("blur", handleLeave);
      window.removeEventListener("focus", handleReturn);
      window.removeEventListener("pagehide", handleLeave);
      window.removeEventListener("pageshow", handleReturn);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };

    const finish = (result: NativeActionRunResult) => {
      if (completed) {
        return;
      }

      completed = true;
      cleanup();
      resolve(result);
    };

    const fail = (error: unknown) => {
      if (completed) {
        return;
      }

      completed = true;
      cleanup();
      reject(error);
    };

    const scheduleDispatchedReturn = () => {
      if (completed || !leftPage) {
        return;
      }

      if (settleTimer) {
        window.clearTimeout(settleTimer);
      }

      settleTimer = window.setTimeout(() => {
        finish({
          ok: true,
          dispatched: true,
          reason: "native-action-returned",
        });
      }, nativeActionReturnSettleMs);
    };

    function handleLeave() {
      leftPage = true;
    }

    function handleReturn() {
      scheduleDispatchedReturn();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        handleLeave();
        return;
      }

      if (document.visibilityState === "visible") {
        handleReturn();
      }
    }

    window.addEventListener("blur", handleLeave);
    window.addEventListener("focus", handleReturn);
    window.addEventListener("pagehide", handleLeave);
    window.addEventListener("pageshow", handleReturn);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    timer = window.setTimeout(
      () =>
        finish({
          ok: true,
          dispatched: true,
          reason: leftPage ? "native-action-return-pending" : "native-action-dispatched",
        }),
      timeoutMs,
    );

    action().then(finish, fail);
  });
}
