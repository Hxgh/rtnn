"use client";

import { useMemo, useRef, useState } from "react";
import {
  createAppNativeCore,
  runNativeActionWithWatchdog,
  type NativeCoreMapCandidate,
  type NativeCoreService,
} from "@/lib/native-core";
import type { AppMessages } from "@/lib/i18n";
import { ActionRowLink } from "@/components/site/action-row";
import { SurfaceCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Messages = AppMessages["nativeCapabilities"];
type ActionState = "idle" | "checking" | "opening";
type DeviceFeatureIconKind = "scan" | "map" | "download" | "diagnostics";
type MapPickerState = "idle" | "checking" | "ready" | "empty" | "failed";

const mapTarget = {
  lat: 30.2741,
  lng: 120.1551,
  name: "杭州西湖",
};
const mapDetectionTimeoutMs = 2_500;
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

function createUnavailableMapCandidates(reason = "map-install-check-unavailable") {
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

function getMapInstallLabel(status: NativeCoreMapCandidate["status"], messages: Messages) {
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
    return null;
  }

  if (candidate.status === "not-installed") {
    return messages.mapNotInstalled;
  }

  if (candidate.status === "unsupported") {
    return messages.mapUnsupported;
  }

  return messages.mapUnavailable;
}

function getMapPickerCaption(candidates: NativeCoreMapCandidate[], messages: Messages) {
  if (candidates.some(isMapCandidateActionable)) {
    return messages.mapPickerDescription;
  }

  return messages.mapPickerEmptyDescription;
}

function getVisibleMapCandidates(candidates: NativeCoreMapCandidate[]) {
  const sortedCandidates = sortMapCandidates(candidates);
  const installedCandidates = sortedCandidates.filter(isMapCandidateActionable);

  return installedCandidates.length > 0 ? sortedCandidates : [];
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

function MapAppMark({
  candidate,
  disabled,
}: {
  candidate: NativeCoreMapCandidate;
  disabled: boolean;
}) {
  const initial = candidate.label.slice(0, 1);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold",
        disabled
          ? "border-border bg-secondary text-muted-foreground"
          : "border-foreground bg-foreground text-background",
      )}
    >
      {initial}
    </span>
  );
}

function MapActionSheet({
  candidates,
  messages,
  onClose,
  onSelect,
  state,
}: {
  candidates: NativeCoreMapCandidate[];
  messages: Messages;
  onClose: () => void;
  onSelect: (candidate: NativeCoreMapCandidate) => void;
  state: MapPickerState;
}) {
  const visibleCandidates = getVisibleMapCandidates(candidates);
  const isChecking = state === "checking";
  const isFailed = state === "failed";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/45"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-modal="true"
        className="mx-auto w-full max-w-[28rem] rounded-t-[1.25rem] border border-border/80 bg-background pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="space-y-1 px-5">
          <h3 className="text-base font-semibold text-foreground">
            {messages.mapPickerTitle}
          </h3>
          <p className="text-xs leading-5 text-muted-foreground">
            {isChecking
              ? messages.mapPickerCheckingDescription
              : isFailed
                ? messages.mapPickerFailedDescription
                : getMapPickerCaption(candidates, messages)}
          </p>
        </div>

        <div className="mt-3 divide-y divide-border/70 bg-card">
          {isChecking ? (
            <div className="px-5 py-5 text-sm text-muted-foreground">
              {messages.mapChecking}
            </div>
          ) : null}
          {!isChecking && visibleCandidates.length === 0 ? (
            <div className="px-5 py-5 text-sm leading-6 text-muted-foreground">
              {isFailed
                ? messages.mapCheckUnavailable
                : messages.mapPickerEmptyDescription}
            </div>
          ) : null}
          {visibleCandidates.map((candidate) => {
            const disabled = !isMapCandidateActionable(candidate);
            const hint = getMapCandidateHint(candidate, messages);

            return (
              <button
                className={cn(
                  "flex min-h-16 w-full items-center justify-between gap-3 px-5 py-3 text-left",
                  disabled
                    ? "cursor-not-allowed bg-card text-muted-foreground"
                    : "bg-card text-foreground active:bg-secondary/80",
                )}
                disabled={disabled}
                key={candidate.appType}
                onClick={() => onSelect(candidate)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <MapAppMark candidate={candidate} disabled={disabled} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {candidate.label}
                    </span>
                    {hint ? (
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                        {hint}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 text-sm leading-5",
                    disabled ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {disabled ? getMapInstallLabel(candidate.status, messages) : "›"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
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
    ) : kind === "download" ? (
      <span aria-hidden="true" className="relative block h-4 w-3 rounded-[2px] border border-current">
        <span className="absolute left-1/2 top-2 h-1.5 w-px -translate-x-1/2 bg-current" />
        <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 border-b border-r border-current" />
      </span>
    ) : (
      <span aria-hidden="true" className="grid size-4 grid-cols-2 gap-1">
        <span className="rounded-full bg-current" />
        <span className="rounded-full bg-current" />
        <span className="rounded-full bg-current" />
        <span className="rounded-full bg-current" />
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
  const mapCandidatesCacheRef = useRef<NativeCoreMapCandidate[] | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapCandidates, setMapCandidates] = useState<NativeCoreMapCandidate[]>([]);
  const [mapActionState, setMapActionState] = useState<ActionState>("idle");
  const [mapPickerState, setMapPickerState] = useState<MapPickerState>("idle");
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  async function detectMaps() {
    if (mapActionState !== "idle") {
      return;
    }

    setLastMessage(null);
    setMapActionState("checking");
    setMapPickerState("checking");
    setMapPickerOpen(true);

    if (mapCandidatesCacheRef.current) {
      setMapCandidates(mapCandidatesCacheRef.current);
      setMapPickerState(
        mapCandidatesCacheRef.current.some(isMapCandidateActionable)
          ? "ready"
          : "empty",
      );
      setMapPickerOpen(true);
      setMapActionState("idle");
      return;
    }

    setMapCandidates([]);

    try {
      const candidates = await withTimeout(
        nativeCore.getMapCandidates(),
        mapDetectionTimeoutMs,
        "map-install-check-timeout",
      );
      const sortedCandidates = sortMapCandidates(candidates);
      mapCandidatesCacheRef.current = sortedCandidates;
      setMapCandidates(sortedCandidates);
      setMapPickerState(
        sortedCandidates.some(isMapCandidateActionable) ? "ready" : "empty",
      );
      setMapPickerOpen(true);
    } catch {
      const unavailableCandidates = createUnavailableMapCandidates();
      setMapCandidates(unavailableCandidates);
      setMapPickerState("failed");
      setLastMessage("map-install-check-unavailable");
      setMapPickerOpen(true);
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
            disabled={mapActionState !== "idle"}
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
              {mapActionState === "checking"
                ? messages.mapChecking
                : mapActionState === "opening"
                  ? messages.opening
                  : "›"}
            </span>
          </button>
          <ActionRowLink
            description={messages.downloadEntryDescription}
            href="/download"
            icon={<FeatureIcon kind="download" label={messages.openDownloads} />}
            title={messages.openDownloads}
          />
          <ActionRowLink
            description={messages.diagnosticsEntryDescription}
            href="/native-diagnostics"
            icon={<FeatureIcon kind="diagnostics" label={messages.openDiagnostics} />}
            title={messages.openDiagnostics}
          />
        </div>
      </SurfaceCard>

      {displayMessage ? (
        <p className="break-words rounded-xl bg-secondary px-3 py-2 text-xs leading-5 text-muted-foreground">
          {displayMessage}
        </p>
      ) : null}

      {mapPickerOpen ? (
        <MapActionSheet
          candidates={mapCandidates}
          messages={messages}
          onClose={() => setMapPickerOpen(false)}
          onSelect={openMap}
          state={mapPickerState}
        />
      ) : null}
    </div>
  );
}
