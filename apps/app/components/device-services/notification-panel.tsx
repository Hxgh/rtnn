"use client";

import { useNotificationAction } from "@/lib/native-core";
import type { AppMessages } from "@/lib/i18n";
import { NotificationAction } from "@/components/native-core";
import { SurfaceCard } from "@/components/ui/card";

type Messages = AppMessages["nativeCapabilities"];

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
  const notification = useNotificationAction({
    payload: {
      title: messages.notificationTitle,
      body: messages.notificationBody,
      tag: messages.notificationTag,
    },
  });
  const displayMessage = getNotificationMessage(notification.reason, messages);

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
          <NotificationAction
            labels={{
              opening: messages.openingShort,
              send: messages.notificationSend,
            }}
            notification={notification}
          />
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
