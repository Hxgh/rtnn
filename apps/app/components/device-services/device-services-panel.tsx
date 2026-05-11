"use client";

import { useMemo, useState } from "react";
import {
  createAppNativeCore,
  runNativeActionWithWatchdog,
  type NativeCoreMapCandidate,
  type NativeCoreService,
} from "@/lib/native-core";
import type { AppMessages } from "@/lib/i18n";
import { ActionRowLink } from "@/components/site/action-row";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Messages = AppMessages["nativeCapabilities"];
type MapPickerState = "idle" | "checking" | "ready" | "failed";
type ActionState = "idle" | "opening";
type DeviceFeatureIconKind = "scan" | "map" | "download";

const mapTarget = {
  lat: 30.2741,
  lng: 120.1551,
  name: "杭州西湖",
};
const mapDetectionTimeoutMs = 3_000;
const mapStatusOrder: Record<NativeCoreMapCandidate["status"], number> = {
  installed: 0,
  unknown: 1,
  "not-installed": 2,
  unsupported: 3,
};

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutReason: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(timeoutReason)), timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function createFallbackMapCandidates(reason = "map-install-check-unavailable") {
  return [
    { appType: "amap" as const, label: "高德地图" },
    { appType: "baidu" as const, label: "百度地图" },
    { appType: "tencent" as const, label: "腾讯地图" },
  ].map((item) => ({
    ...item,
    ok: true,
    installed: null,
    status: "unknown" as const,
    available: false,
    reason,
  }));
}

function sortMapCandidates(candidates: NativeCoreMapCandidate[]) {
  return [...candidates].sort(
    (left, right) =>
      mapStatusOrder[left.status] - mapStatusOrder[right.status],
  );
}

function isMapCandidateActionable(candidate: NativeCoreMapCandidate) {
  return candidate.status === "installed";
}

function getMapInstallLabel(
  status: NativeCoreMapCandidate["status"],
  messages: Messages,
) {
  if (status === "installed") {
    return messages.mapInstalled;
  }

  if (status === "not-installed") {
    return messages.mapNotInstalled;
  }

  if (status === "unsupported") {
    return messages.mapUnsupported;
  }

  return messages.mapUnavailable;
}

function getMapCandidateHint(
  candidate: NativeCoreMapCandidate,
  messages: Messages,
) {
  if (candidate.status === "installed") {
    return messages.mapReadyHint;
  }

  if (candidate.status === "not-installed") {
    return messages.mapNotInstalled;
  }

  if (candidate.status === "unsupported") {
    return messages.mapUnsupported;
  }

  if (candidate.reason === "map-app-not-installed-or-not-visible") {
    return messages.mapVisibilityLimited;
  }

  return messages.mapCheckUnavailable;
}

function getMapPickerDescription(
  state: MapPickerState,
  candidates: NativeCoreMapCandidate[],
  messages: Messages,
) {
  if (state === "checking") {
    return messages.mapPickerCheckingDescription;
  }

  if (state === "failed") {
    return messages.mapCheckUnavailable;
  }

  const installedCount = candidates.filter(isMapCandidateActionable).length;
  if (installedCount > 0) {
    return messages.mapDetectedAvailable.replace("{count}", String(installedCount));
  }

  return messages.mapNoInstalled;
}

function getMapPickerCaption(
  state: MapPickerState,
  candidates: NativeCoreMapCandidate[],
  messages: Messages,
) {
  if (state === "ready" && candidates.some(isMapCandidateActionable)) {
    return messages.mapPickerDescription;
  }

  return getMapPickerDescription(state, candidates, messages);
}

function getActionMessage(reason: string | null, messages: Messages) {
  if (!reason) {
    return null;
  }

  if (
    reason === "map-install-check-timeout" ||
    reason === "map-install-check-unavailable" ||
    reason === "native-bridge-not-ready"
  ) {
    return messages.mapCheckUnavailable;
  }

  if (reason === "map-app-not-installed-or-not-visible") {
    return messages.mapVisibilityLimited;
  }

  if (reason === "native-map-open-failed" || reason === "native-map-no-handler") {
    return messages.mapOpenFailed;
  }

  if (reason === "browser-open-unavailable" || reason === "webview-url-not-allowed") {
    return messages.webviewLoadFailed;
  }

  return null;
}

function FeatureIcon({
  kind,
  label,
}: {
  kind: DeviceFeatureIconKind;
  label: string;
}) {
  const symbol =
    kind === "scan" ? (
      <span aria-hidden="true" className="grid size-4 grid-cols-2 grid-rows-2 gap-0.5">
        <span className="rounded-[2px] border border-current" />
        <span className="rounded-[2px] border border-current" />
        <span className="rounded-[2px] border border-current" />
        <span className="rounded-[2px] border border-current" />
      </span>
    ) : kind === "map" ? (
      <span aria-hidden="true" className="relative block size-4 rounded-full border border-current">
        <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
      </span>
    ) : (
      <span aria-hidden="true" className="relative block h-4 w-3 rounded-[2px] border border-current">
        <span className="absolute left-1/2 top-2 h-1.5 w-px -translate-x-1/2 bg-current" />
        <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 border-b border-r border-current" />
      </span>
    );

  return (
    <span
      aria-label={label}
      className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground"
      title={label}
    >
      {symbol}
    </span>
  );
}

export function DeviceServicesPanel({ messages }: { messages: Messages }) {
  const nativeCore = useMemo<NativeCoreService>(() => createAppNativeCore(), []);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapPickerState, setMapPickerState] = useState<MapPickerState>("idle");
  const [mapCandidates, setMapCandidates] = useState<NativeCoreMapCandidate[]>([]);
  const [mapActionState, setMapActionState] = useState<ActionState>("idle");
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  async function detectMaps() {
    setLastMessage(null);
    setMapActionState("opening");
    setMapPickerState("checking");
    setMapCandidates(createFallbackMapCandidates("map-install-checking"));
    setMapPickerOpen(true);

    try {
      const candidates = await withTimeout(
        nativeCore.getMapCandidates(),
        mapDetectionTimeoutMs,
        "map-install-check-timeout",
      );
      setMapCandidates(candidates);
      setMapPickerState("ready");
    } catch (error) {
      const reason =
        error instanceof Error && error.message
          ? error.message
          : "map-install-check-unavailable";

      setMapCandidates(createFallbackMapCandidates(reason));
      setMapPickerState("failed");
      setLastMessage(reason);
    } finally {
      setMapActionState("idle");
    }
  }

  async function openMap(candidate: NativeCoreMapCandidate) {
    if (!isMapCandidateActionable(candidate)) {
      setLastMessage(candidate.reason ?? "map-install-check-unavailable");
      return;
    }

    setMapPickerOpen(false);
    setMapActionState("opening");
    setLastMessage(null);

    try {
      const result = await runNativeActionWithWatchdog(() =>
        nativeCore.openMapNavigation({
          ...mapTarget,
          appType: candidate.appType,
          allowWebFallback: false,
        }),
      );

      setLastMessage(result.ok ? null : (result.reason ?? "native-map-open-failed"));
    } catch (error) {
      setLastMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setMapActionState("idle");
    }
  }

  const displayMessage = getActionMessage(lastMessage, messages);

  return (
    <div className="space-y-5">
      <SurfaceCard className="overflow-hidden">
        <div className="divide-y divide-border/70">
          <ActionRowLink
            description={messages.barcodeDescription}
            href="/device-services/scan"
            icon={<FeatureIcon kind="scan" label={messages.barcodeTitle} />}
            title={messages.barcodeTitle}
          />
          <button
            className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-secondary/55 disabled:opacity-60"
            disabled={mapActionState === "opening"}
            onClick={detectMaps}
            type="button"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <FeatureIcon kind="map" label={messages.mapTitle} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{messages.mapTitle}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {messages.mapDescription}
                </p>
              </div>
            </div>
            <span className="text-sm text-muted-foreground">
              {mapActionState === "opening" ? messages.opening : "›"}
            </span>
          </button>
          <ActionRowLink
            description={messages.downloadEntryDescription}
            href="/download"
            icon={<FeatureIcon kind="download" label={messages.openDownloads} />}
            title={messages.openDownloads}
          />
        </div>
      </SurfaceCard>

      <ActionRowLink
        className="rounded-2xl border border-dashed border-border/80 bg-card px-4 py-3"
        description={messages.diagnosticsEntryDescription}
        href="/native-diagnostics"
        title={messages.openDiagnostics}
      />

      {displayMessage ? (
        <p className="break-words rounded-xl bg-secondary px-3 py-2 text-xs leading-5 text-muted-foreground">
          {displayMessage}
        </p>
      ) : null}

      {mapPickerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/45"
          onClick={() => setMapPickerOpen(false)}
          role="presentation"
        >
          <div
            aria-modal="true"
            className="w-full rounded-t-[1.75rem] border border-border/80 bg-background px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">
                {messages.mapPickerTitle}
              </h3>
              <p className="text-xs leading-5 text-muted-foreground">
                {getMapPickerCaption(mapPickerState, mapCandidates, messages)}
              </p>
            </div>

            <div className="mt-4 divide-y divide-border/70 rounded-2xl border border-border/70 bg-card">
              {sortMapCandidates(
                mapCandidates.length > 0 ? mapCandidates : createFallbackMapCandidates(),
              ).map((candidate) => {
                const disabled =
                  mapPickerState === "checking" || !isMapCandidateActionable(candidate);

                return (
                  <button
                    className={cn(
                      "flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left first:rounded-t-2xl last:rounded-b-2xl",
                      disabled
                        ? "cursor-not-allowed text-muted-foreground"
                        : "text-foreground active:bg-secondary",
                    )}
                    disabled={disabled}
                    key={candidate.appType}
                    onClick={() => openMap(candidate)}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {candidate.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                        {mapPickerState === "checking"
                          ? messages.mapChecking
                          : getMapCandidateHint(candidate, messages)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-1 text-[11px]",
                        isMapCandidateActionable(candidate)
                          ? "bg-secondary text-foreground"
                          : "bg-transparent text-muted-foreground",
                      )}
                    >
                      {mapPickerState === "checking"
                        ? messages.mapChecking
                        : getMapInstallLabel(candidate.status, messages)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                disabled={mapPickerState === "checking"}
                onClick={detectMaps}
                type="button"
                variant="outline"
              >
                {mapPickerState === "checking" ? messages.opening : messages.mapRefresh}
              </Button>
              <Button
                onClick={() => setMapPickerOpen(false)}
                type="button"
                variant="ghost"
              >
                {messages.close}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
