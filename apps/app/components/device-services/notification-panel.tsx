"use client";

import { useMemo, useState } from "react";
import {
  createAppNativeCore,
  nativeActionReturnSettleMs,
  runNativeActionWithWatchdog,
  type NativeCoreService,
} from "@/lib/native-core";
import type { AppMessages } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";

type Messages = AppMessages["nativeCapabilities"];
type NotificationActionState = "idle" | "opening";

function getNotificationMessage(reason: string | null, messages: Messages) {
  if (!reason) {
    return null;
  }

  if (reason.endsWith("-permission-denied") || reason === "permission-denied") {
    return messages.permissionDenied;
  }

  if (
    reason === "cancelled" ||
    reason === "canceled" ||
    reason.toLowerCase().includes("cancel")
  ) {
    return null;
  }

  if (reason === "notification-sent") {
    return messages.notificationSent;
  }

  return messages.failed;
}

export function NotificationPanel({ messages }: { messages: Messages }) {
  const nativeCore = useMemo<NativeCoreService>(() => createAppNativeCore(), []);
  const [state, setState] = useState<NotificationActionState>("idle");
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  async function sendNotification() {
    if (state !== "idle") {
      return;
    }

    setState("opening");
    setLastMessage(null);

    try {
      const result = await runNativeActionWithWatchdog(() =>
        nativeCore.showNotification(),
      );

      window.setTimeout(() => {
        setLastMessage(result.ok ? "notification-sent" : (result.reason ?? "notification-unavailable"));
      }, nativeActionReturnSettleMs);
    } catch (error) {
      setLastMessage(error instanceof Error ? error.message : String(error));
    } finally {
      window.setTimeout(() => setState("idle"), 500);
    }
  }

  const displayMessage = getNotificationMessage(lastMessage, messages);

  return (
    <div className="space-y-5">
      <SurfaceCard className="overflow-hidden">
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">
              {messages.notificationTitle}
            </h2>
            <p className="text-xs leading-5 text-muted-foreground">
              {messages.notificationDescription}
            </p>
          </div>
          <Button
            className="w-full"
            disabled={state !== "idle"}
            onClick={sendNotification}
            type="button"
          >
            {state === "opening" ? messages.openingShort : messages.notificationSend}
          </Button>
        </div>
      </SurfaceCard>

      {displayMessage ? (
        <p className="break-words rounded-xl bg-secondary px-3 py-2 text-xs leading-5 text-muted-foreground">
          {displayMessage}
        </p>
      ) : null}
    </div>
  );
}
