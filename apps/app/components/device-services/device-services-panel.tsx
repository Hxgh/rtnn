"use client";

import { useMemo, useState } from "react";
import {
  createAppNativeCore,
  nativeActionReturnSettleMs,
  runNativeActionWithWatchdog,
  type NativeCoreService,
} from "@/lib/native-core";
import type { AppMessages } from "@/lib/i18n";
import { ActionRowLink } from "@/components/site/action-row";
import { PageSection } from "@/components/site/page-shell";
import { SurfaceCard } from "@/components/ui/card";
import { DeviceFeatureIcon } from "./device-feature-icon";

type Messages = AppMessages["nativeCapabilities"];
type NotificationActionState = "idle" | "opening";

function getActionMessage(reason: string | null, messages: Messages) {
  if (!reason) {
    return null;
  }

  if (reason.endsWith("-permission-denied") || reason === "permission-denied") {
    return messages.permissionDenied;
  }

  if (reason === "notification-unavailable") {
    return messages.failed;
  }

  if (
    reason === "cancelled" ||
    reason === "canceled" ||
    reason.toLowerCase().includes("cancel")
  ) {
    return null;
  }

  return messages.failed;
}

export function DeviceServicesPanel({ messages }: { messages: Messages }) {
  const nativeCore = useMemo<NativeCoreService>(() => createAppNativeCore(), []);
  const [notificationActionState, setNotificationActionState] =
    useState<NotificationActionState>("idle");
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  async function sendNotification() {
    if (notificationActionState !== "idle") {
      return;
    }

    setNotificationActionState("opening");
    setLastMessage(null);

    try {
      const result = await runNativeActionWithWatchdog(() =>
        nativeCore.showNotification(),
      );

      window.setTimeout(() => {
        setLastMessage(result.ok ? null : (result.reason ?? "notification-unavailable"));
      }, nativeActionReturnSettleMs);
    } catch (error) {
      setLastMessage(error instanceof Error ? error.message : String(error));
    } finally {
      window.setTimeout(() => setNotificationActionState("idle"), 500);
    }
  }

  const displayMessage = getActionMessage(lastMessage, messages);

  return (
    <div className="space-y-5">
      <PageSection title={messages.serviceActionsTitle}>
        <SurfaceCard className="overflow-hidden">
          <div className="divide-y divide-border/70">
            <ActionRowLink
              description={messages.barcodeDescription}
              href="/device-services/scan"
              icon={<DeviceFeatureIcon kind="scan" label={messages.barcodeTitle} />}
              title={messages.barcodeTitle}
            />
            <ActionRowLink
              description={messages.mapDescription}
              href="/device-services/map"
              icon={<DeviceFeatureIcon kind="map" label={messages.mapTitle} />}
              title={messages.mapTitle}
            />
            <ActionRowLink
              description={messages.mediaDescription}
              href="/device-services/media"
              icon={<DeviceFeatureIcon kind="media" label={messages.mediaTitle} />}
              title={messages.mediaTitle}
            />
            <button
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-secondary/55 disabled:opacity-60"
              disabled={notificationActionState !== "idle"}
              onClick={sendNotification}
              type="button"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground">
                  <DeviceFeatureIcon kind="notification" label={messages.notificationTitle} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {messages.notificationTitle}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {messages.notificationDescription}
                  </p>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">
                {notificationActionState === "opening" ? messages.openingShort : "›"}
              </span>
            </button>
          </div>
        </SurfaceCard>
      </PageSection>

      {displayMessage ? (
        <p className="break-words rounded-xl bg-secondary px-3 py-2 text-xs leading-5 text-muted-foreground">
          {displayMessage}
        </p>
      ) : null}

      <PageSection title={messages.serviceSupportTitle}>
        <SurfaceCard className="overflow-hidden">
          <div className="divide-y divide-border/70">
            <ActionRowLink
              description={messages.downloadEntryDescription}
              href="/download"
              icon={<DeviceFeatureIcon kind="download" label={messages.openDownloads} />}
              title={messages.openDownloads}
            />
            <ActionRowLink
              description={messages.diagnosticsEntryDescription}
              href="/native-diagnostics"
              icon={<DeviceFeatureIcon kind="diagnostics" label={messages.openDiagnostics} />}
              title={messages.openDiagnostics}
            />
          </div>
        </SurfaceCard>
      </PageSection>
    </div>
  );
}
