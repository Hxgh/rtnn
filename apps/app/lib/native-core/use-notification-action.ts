"use client";

import { useMemo, useState } from "react";
import { createAppNativeCore } from "./service";
import {
  nativeActionReturnSettleMs,
  runNativeActionWithWatchdog,
} from "./actions";
import type { NativeCoreService } from "./types";

export type NotificationActionState = "idle" | "opening";

export type UseNotificationActionOptions = {
  nativeCore?: NativeCoreService;
};

export type UseNotificationActionReturn = {
  state: NotificationActionState;
  reason: string | null;
  isOpening: boolean;
  sendNotification: () => Promise<void>;
};

export function useNotificationAction(
  options: UseNotificationActionOptions = {},
): UseNotificationActionReturn {
  const fallbackNativeCore = useMemo<NativeCoreService>(() => createAppNativeCore(), []);
  const nativeCore = options.nativeCore ?? fallbackNativeCore;
  const [state, setState] = useState<NotificationActionState>("idle");
  const [reason, setReason] = useState<string | null>(null);

  async function sendNotification() {
    if (state !== "idle") {
      return;
    }

    setState("opening");
    setReason(null);

    try {
      const result = await runNativeActionWithWatchdog(() =>
        nativeCore.showNotification(),
      );

      window.setTimeout(() => {
        setReason(result.ok ? "notification-sent" : (result.reason ?? "notification-unavailable"));
      }, nativeActionReturnSettleMs);
    } catch (error) {
      setReason(error instanceof Error ? error.message : String(error));
    } finally {
      window.setTimeout(() => setState("idle"), 500);
    }
  }

  return {
    state,
    reason,
    isOpening: state === "opening",
    sendNotification,
  };
}
