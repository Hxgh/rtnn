"use client";

import type { ReactNode } from "react";
import type { UseNotificationActionReturn } from "@/lib/native-core";
import { Button } from "@/components/ui/button";

export type NotificationActionLabels = {
  send: ReactNode;
  opening: ReactNode;
};

export function NotificationAction({
  labels,
  notification,
}: {
  labels: NotificationActionLabels;
  notification: UseNotificationActionReturn;
}) {
  return (
    <Button
      className="w-full"
      disabled={notification.state !== "idle"}
      onClick={() => void notification.sendNotification()}
      type="button"
    >
      {notification.isOpening ? labels.opening : labels.send}
    </Button>
  );
}
