"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAppNativeCore,
  isNativeActionCancelled,
  runNativeActionWithWatchdog,
  type NativeCoreActionResult,
  type NativeCoreMapCandidate,
  type NativeCorePermissionKind,
  type NativeCorePermissionResult,
  type NativeCorePickedFile,
  type NativeCoreService,
  type NativeMediaSource,
} from "@/lib/native-core";
import type { AppMessages } from "@/lib/i18n";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SurfaceCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type NativeCapabilitiesMessages = AppMessages["nativeCapabilities"];

type ActionState = "idle" | "opening" | "opened" | "cancelled" | "failed";
type MapCandidateView = NativeCoreMapCandidate & {
  checking?: boolean;
};
type MapPickerState = "idle" | "checking" | "ready" | "failed";
type BusyAction =
  | "external"
  | "webview"
  | "map"
  | "image"
  | "notification"
  | null;
type VisiblePermissionKind = Extract<
  NativeCorePermissionKind,
  "photo-library" | "camera" | "notification"
>;
type PermissionActionSource = Extract<NativeMediaSource, "album"> | "camera-permission";

const mapTarget = {
  lat: 30.2741,
  lng: 120.1551,
  name: "杭州西湖",
};
const permissionKinds: VisiblePermissionKind[] = [
  "photo-library",
  "camera",
  "notification",
];
const emptyPermissions: Record<
  VisiblePermissionKind,
  NativeCorePermissionResult | null
> = {
  "photo-library": null,
  camera: null,
  notification: null,
};
const mediaPickerTimeoutMs = 12_000;
const mapDetectionTimeoutMs = 3_000;
const transientActionStateMs = 1_200;
const nativeActionDispatchStateMs = 1_800;
const mapStatusOrder: Record<NativeCoreMapCandidate["status"], number> = {
  installed: 0,
  unknown: 1,
  "not-installed": 2,
  unsupported: 3,
};

function createFallbackMapCandidates(): NativeCoreMapCandidate[] {
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
    reason: "map-install-check-unavailable",
  }));
}

function createCheckingMapCandidates(): MapCandidateView[] {
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
    checking: true,
    reason: "map-install-checking",
  }));
}

function isOpened(result: NativeCoreActionResult) {
  return result.ok;
}

function isDispatched(result: NativeCoreActionResult) {
  return Boolean("dispatched" in result && result.dispatched);
}

function isCancelled(result: NativeCoreActionResult) {
  return isNativeActionCancelled(result);
}

function resolveExternalCheckUrl() {
  return new URL("/download", window.location.href).toString();
}

function formatFileSize(value: number) {
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function getPermissionLabel(
  kind: VisiblePermissionKind,
  messages: NativeCapabilitiesMessages,
) {
  if (kind === "photo-library") {
    return messages.photoPermission;
  }

  if (kind === "camera") {
    return messages.cameraPermission;
  }

  return messages.notificationPermission;
}

function getPermissionStatusLabel(
  result: NativeCorePermissionResult | null,
  messages: NativeCapabilitiesMessages,
) {
  if (result?.reason === "permission-managed-by-file-picker") {
    return messages.permissionActionDriven;
  }

  if (!result) {
    return messages.permissionUnknown;
  }

  if (result.status === "granted") {
    return messages.permissionGranted;
  }

  if (result.status === "denied") {
    return messages.permissionDenied;
  }

  if (result.status === "prompt") {
    return messages.permissionPrompt;
  }

  if (result.status === "unsupported") {
    return messages.permissionUnsupported;
  }

  return messages.permissionUnknown;
}

function getMapInstallLabel(
  status: NativeCoreMapCandidate["status"],
  messages: NativeCapabilitiesMessages,
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
  messages: NativeCapabilitiesMessages,
) {
  if (candidate.status === "installed") {
    return messages.mapReadyHint;
  }

  if (candidate.reason === "map-install-check-timeout") {
    return messages.mapCheckUnavailable;
  }

  if (candidate.reason === "map-app-not-installed-or-not-visible") {
    return messages.mapVisibilityLimited;
  }

  if (candidate.reason === "map-install-check-unavailable") {
    return messages.mapCheckUnavailable;
  }

  if (candidate.reason === "native-bridge-not-ready") {
    return messages.mapCheckUnavailable;
  }

  return candidate.status === "unknown" ? messages.mapCheckUnavailable : undefined;
}

function getMapSummary(
  candidates: NativeCoreMapCandidate[],
  installedMapCount: number,
  messages: NativeCapabilitiesMessages,
) {
  if (candidates.length === 0) {
    return messages.mapChecking;
  }

  if (installedMapCount > 0) {
    return messages.mapDetectedAvailable.replace("{count}", String(installedMapCount));
  }

  if (candidates.every((item) => item.status === "not-installed")) {
    return messages.mapNoInstalled;
  }

  return messages.mapCheckUnavailable;
}

function getMapPickerDescription(
  state: MapPickerState,
  messages: NativeCapabilitiesMessages,
) {
  if (state === "checking") {
    return messages.mapPickerCheckingDescription;
  }

  if (state === "failed") {
    return messages.mapCheckUnavailable;
  }

  return messages.mapPickerDescription;
}

function getMapStatusText(
  candidate: MapCandidateView,
  messages: NativeCapabilitiesMessages,
) {
  if (candidate.checking) {
    return messages.mapChecking;
  }

  if (candidate.status === "installed") {
    return messages.mapOpenWith;
  }

  if (candidate.status === "not-installed") {
    return messages.mapNotInstalled;
  }

  if (candidate.status === "unsupported") {
    return messages.mapUnsupported;
  }

  return messages.mapUnavailable;
}

function getMapActionAccessibilityLabel(
  candidate: MapCandidateView,
  messages: NativeCapabilitiesMessages,
) {
  if (candidate.status === "installed") {
    return `${messages.mapOpenWith}${candidate.label}`;
  }

  return `${candidate.label}${getMapInstallLabel(candidate.status, messages)}`;
}

function getSortedMapCandidates(candidates: NativeCoreMapCandidate[]) {
  return [...candidates].sort(
    (left, right) =>
      mapStatusOrder[left.status] - mapStatusOrder[right.status],
  );
}

function getActionMessage(
  reason: string | null,
  messages: NativeCapabilitiesMessages,
) {
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

  if (
    reason === "file-picker-cancelled" ||
    reason === "barcode-scan-cancelled" ||
    reason === "cancelled" ||
    reason === "canceled"
  ) {
    return messages.cancelled;
  }

  if (reason.endsWith("-permission-denied") || reason === "permission-denied") {
    return messages.permissionDenied;
  }

  return null;
}

function isMapCandidateActionable(candidate: NativeCoreMapCandidate) {
  return candidate.status === "installed";
}

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

function isPickerManagedPermission(result: NativeCorePermissionResult | null) {
  return result?.reason === "permission-managed-by-file-picker";
}

function getPickerManagedPermissionSource(kind: VisiblePermissionKind): PermissionActionSource | null {
  if (kind === "photo-library") {
    return "album" as const;
  }

  if (kind === "camera") {
    return "camera-permission";
  }

  return null;
}

export function NativeCapabilitiesPanel({
  messages,
}: {
  messages: NativeCapabilitiesMessages;
}) {
  const nativeCore = useMemo<NativeCoreService>(() => createAppNativeCore(), []);
  const [capabilities, setCapabilities] = useState({
    externalOpen: true,
    inAppWebView: true,
    mapNavigation: true,
    filePick: true,
    notification: true,
    barcodeScan: true,
  });
  const [externalState, setExternalState] = useState<ActionState>("idle");
  const [webViewState, setWebViewState] = useState<ActionState>("idle");
  const [mapState, setMapState] = useState<ActionState>("idle");
  const [imageState, setImageState] = useState<ActionState>("idle");
  const [notificationState, setNotificationState] =
    useState<ActionState>("idle");
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [activeMediaSource, setActiveMediaSource] =
    useState<NativeMediaSource | null>(null);
  const [mapCandidates, setMapCandidates] = useState<NativeCoreMapCandidate[]>([]);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapPickerState, setMapPickerState] = useState<MapPickerState>("idle");
  const [mapRefreshing, setMapRefreshing] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<
    Record<VisiblePermissionKind, ActionState>
  >({
    "photo-library": "idle",
    camera: "idle",
    notification: "idle",
  });
  const [images, setImages] = useState<NativeCorePickedFile[]>([]);
  const [permissions, setPermissions] =
    useState<Record<VisiblePermissionKind, NativeCorePermissionResult | null>>(
      emptyPermissions,
    );
  const visibleLastMessage = getActionMessage(lastMessage, messages);

  useEffect(() => {
    const entries: Array<[ActionState, (state: ActionState) => void]> = [
      [externalState, setExternalState],
      [webViewState, setWebViewState],
      [mapState, setMapState],
      [imageState, setImageState],
      [notificationState, setNotificationState],
    ];
    const timers = entries
      .filter(([state]) => state === "opened" || state === "cancelled" || state === "failed")
      .map(([, setState]) =>
        window.setTimeout(() => setState("idle"), transientActionStateMs),
      );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [externalState, webViewState, mapState, imageState, notificationState]);

  useEffect(() => {
    if (!busyAction) {
      return;
    }

    let leftPage = false;

    const clearBusyAction = () => {
      if (!leftPage) {
        return;
      }

      window.setTimeout(() => {
        if (busyAction === "external") {
          setExternalState((state) => (state === "opening" ? "opened" : state));
        } else if (busyAction === "webview") {
          setWebViewState((state) => (state === "opening" ? "opened" : state));
        } else if (busyAction === "map") {
          setMapState((state) => (state === "opening" ? "opened" : state));
        } else if (busyAction === "image") {
          setImageState((state) => (state === "opening" ? "idle" : state));
          setActiveMediaSource(null);
        } else if (busyAction === "notification") {
          setNotificationState((state) =>
            state === "opening" ? "opened" : state,
          );
        }
        setBusyAction(null);
      }, 500);
    };

    const handleLeave = () => {
      leftPage = true;
    };
    const handleReturn = () => {
      clearBusyAction();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleLeave();
        return;
      }

      if (document.visibilityState === "visible") {
        handleReturn();
      }
    };

    window.addEventListener("blur", handleLeave);
    window.addEventListener("focus", handleReturn);
    window.addEventListener("pagehide", handleLeave);
    window.addEventListener("pageshow", handleReturn);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleLeave);
      window.removeEventListener("focus", handleReturn);
      window.removeEventListener("pagehide", handleLeave);
      window.removeEventListener("pageshow", handleReturn);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [busyAction]);

  const refreshMapCandidates = useCallback(
    async (options: { silent?: boolean; timeoutMs?: number } = {}) => {
      if (!options.silent) {
        setMapRefreshing(true);
        setMapPickerState("checking");
        setMapCandidates(createCheckingMapCandidates());
      }

      try {
        const candidates = await (options.timeoutMs
          ? withTimeout(
              nativeCore.getMapCandidates(),
              options.timeoutMs,
              "map-install-check-timeout",
            )
          : nativeCore.getMapCandidates());

        setMapCandidates(candidates);
        setMapPickerState("ready");
      } catch (error) {
        const reason =
          error instanceof Error && error.message
            ? error.message
            : "map-install-check-unavailable";

        setMapCandidates(
          createFallbackMapCandidates().map((candidate) => ({
            ...candidate,
            available: false,
            reason,
          })),
        );
        setMapPickerState("failed");
      } finally {
        if (!options.silent) {
          setMapRefreshing(false);
        }
      }
    },
    [nativeCore],
  );

  useEffect(() => {
    let active = true;

    nativeCore
      .getRuntimeSnapshot()
      .then((snapshot) => {
        if (active) {
          setCapabilities(snapshot.capabilities);
        }
      })
      .catch(() => {
        if (active) {
          setCapabilities((current) => current);
        }
      });

    nativeCore
      .getMapCandidates()
      .then((candidates: NativeCoreMapCandidate[]) => {
        if (active) {
          setMapCandidates(candidates);
          setMapPickerState("ready");
        }
      })
      .catch(() => {
        if (active) {
          setMapCandidates(createFallbackMapCandidates());
          setMapPickerState("failed");
        }
      });

    nativeCore
      .checkPermissions(permissionKinds)
      .then((snapshot) => {
        if (!active) {
          return;
        }

        setPermissions((current) => ({
          ...current,
          ...snapshot,
        }));
      })
      .catch(() => {
        if (active) {
          setPermissions(emptyPermissions);
        }
      });

    return () => {
      active = false;
    };
  }, [nativeCore]);

  const externalAvailable = capabilities.externalOpen;
  const webViewAvailable = capabilities.inAppWebView;
  const mapAvailable = capabilities.mapNavigation;
  const imagePickerAvailable = capabilities.filePick;
  const notificationAvailable = capabilities.notification;
  const installedMapCount = mapCandidates.filter(
    (item) => item.status === "installed",
  ).length;

  async function runAction(
    actionType: Exclude<BusyAction, null>,
    setState: (state: ActionState) => void,
    action: () => Promise<NativeCoreActionResult>,
  ) {
    setState("opening");
    setBusyAction(actionType);
    setLastMessage(null);

    try {
      const result = await runNativeActionWithWatchdog(action);
      setLastMessage(result.message ?? result.reason ?? null);
      setState(isOpened(result) ? "opened" : isCancelled(result) ? "cancelled" : "failed");

      if (isDispatched(result)) {
        window.setTimeout(() => setState("idle"), nativeActionDispatchStateMs);
      }
    } catch (error) {
      setLastMessage(error instanceof Error ? error.message : String(error));
      setState("failed");
    } finally {
      setBusyAction((current) => (current === actionType ? null : current));
    }
  }

  async function refreshPermissionsFor(kinds: VisiblePermissionKind[]) {
    const snapshot = await nativeCore.checkPermissions(kinds);

    setPermissions((current) => ({
      ...current,
      ...snapshot,
    }));
  }

  async function handleRequestPermission(kind: VisiblePermissionKind) {
    const pickerSource = getPickerManagedPermissionSource(kind);

    if (pickerSource) {
      setPermissionState((current) => ({ ...current, [kind]: "opening" }));
      try {
        if (pickerSource === "album") {
          await handlePickMedia("album");
        } else {
          const result = await nativeCore.requestPermission("camera");

          setPermissions((current) => ({
            ...current,
            camera: result,
          }));
          setLastMessage(
            result.message ?? result.reason ?? messages.permissionRequestDone,
          );
        }
      } finally {
        setPermissionState((current) => ({ ...current, [kind]: "idle" }));
      }
      return;
    }

    setPermissionState((current) => ({ ...current, [kind]: "opening" }));

    try {
      const result = await nativeCore.requestPermission(kind);

      setPermissions((current) => ({
        ...current,
        [kind]: result,
      }));
      setLastMessage(
        result.message ?? result.reason ?? messages.permissionRequestDone,
      );
      setPermissionState((current) => ({
        ...current,
        [kind]: result.ok ? "opened" : "failed",
      }));
    } catch (error) {
      setLastMessage(error instanceof Error ? error.message : String(error));
      setPermissionState((current) => ({ ...current, [kind]: "failed" }));
    } finally {
      window.setTimeout(() => {
        setPermissionState((current) => ({ ...current, [kind]: "idle" }));
      }, transientActionStateMs);
    }
  }

  async function handlePickMedia(source: NativeMediaSource) {
    setImageState("opening");
    setBusyAction("image");
    setActiveMediaSource(source);
    setLastMessage(null);

    try {
      const result = await nativeCore.pickMedia(source, {
        timeoutMs: mediaPickerTimeoutMs,
      });

      setLastMessage(result.reason ?? result.message ?? null);

      if (result.ok) {
        setImages(result.files);
        setImageState("opened");
        void refreshPermissionsFor(
          nativeCore.getActionPermissionKinds(result.action) as VisiblePermissionKind[],
        ).catch(() => {});
        return;
      }

      setImageState(isCancelled(result) ? "cancelled" : "failed");
    } catch (error) {
      setLastMessage(error instanceof Error ? error.message : String(error));
      setImageState("failed");
    } finally {
      setActiveMediaSource(null);
      setBusyAction((current) => (current === "image" ? null : current));
    }
  }

  async function handleSendNotification() {
    await runAction("notification", setNotificationState, () =>
      nativeCore.showNotification(),
    );
    void refreshPermissionsFor(["notification"]).catch(() => {});
  }

  async function handleOpenMapPicker() {
    setLastMessage(null);
    setMapState("opening");
    setMapPickerState("checking");
    setMapCandidates(createCheckingMapCandidates());

    try {
      await refreshMapCandidates({ timeoutMs: mapDetectionTimeoutMs });
    } finally {
      setMapPickerOpen(true);
      setMapState("idle");
    }
  }

  async function handleOpenMapCandidate(candidate: NativeCoreMapCandidate) {
    if (!isMapCandidateActionable(candidate)) {
      setLastMessage(candidate.reason ?? "map-install-check-unavailable");
      setMapState("failed");
      return;
    }

    setMapPickerOpen(false);
    await runAction("map", setMapState, () =>
      nativeCore.openMapNavigation({
        ...mapTarget,
        appType: candidate.appType,
        allowWebFallback: false,
      }),
    );
  }

  return (
    <div className="space-y-6">
      <SurfaceCard className="overflow-hidden">
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{messages.externalTitle}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{messages.externalDescription}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={!webViewAvailable || webViewState === "opening"}
              onClick={() =>
                runAction("webview", setWebViewState, () =>
                  nativeCore.openInAppWebView(resolveExternalCheckUrl()),
                )
              }
              variant="outline"
            >
              {webViewState === "opening" ? messages.opening : messages.openInAppWebView}
            </Button>
            <Button
              disabled={!externalAvailable || externalState === "opening"}
              onClick={() =>
                runAction("external", setExternalState, () =>
                  nativeCore.openExternalUrl(resolveExternalCheckUrl()),
                )
              }
              variant="outline"
            >
              {externalState === "opening" ? messages.opening : messages.openExternal}
            </Button>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            {messages.webviewDescription}
          </p>
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{messages.mapTitle}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{messages.mapDescription}</p>
          </div>

          <div className="rounded-xl border border-border/70 px-3 py-3 text-xs leading-5 text-muted-foreground">
            {mapCandidates.length > 0 ? (
              <div className="space-y-1">
                <p>{getMapSummary(mapCandidates, installedMapCount, messages)}</p>
                {mapCandidates.some((item) => item.reason === "map-app-not-installed-or-not-visible") ? (
                  <p>{messages.mapVisibilityLimited}</p>
                ) : null}
              </div>
            ) : (
              <span>{messages.mapChecking}</span>
            )}
          </div>

          <Button
            disabled={!mapAvailable || mapState === "opening" || mapRefreshing}
            onClick={handleOpenMapPicker}
            variant="outline"
          >
            {mapState === "opening" || mapPickerState === "checking"
              ? messages.opening
              : messages.openMap}
          </Button>
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{messages.mediaTitle}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{messages.mediaDescription}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={!imagePickerAvailable || imageState === "opening"}
              onClick={() => handlePickMedia("album")}
              variant="outline"
            >
              {imageState === "opening" && activeMediaSource === "album"
                ? messages.opening
                : messages.pickImages}
            </Button>
            <Button
              disabled={!imagePickerAvailable || imageState === "opening"}
              onClick={() => handlePickMedia("camera")}
              variant="outline"
            >
              {imageState === "opening" && activeMediaSource === "camera"
                ? messages.opening
                : messages.captureImage}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-muted-foreground">
                {images.length > 0 ? messages.selectedImages : messages.noImages}
              </p>
              {images.length > 0 ? (
                <Button onClick={() => setImages([])} size="sm" variant="ghost">
                  {messages.clearImages}
                </Button>
              ) : null}
            </div>
            {images.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {images.map((image, index) => (
                  <div
                    className="overflow-hidden rounded-xl border border-border/80 bg-secondary"
                    key={`${image.name}:${image.size}:${index}`}
                  >
                    {image.dataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={image.name}
                        className="aspect-square w-full object-cover"
                        src={image.dataUrl}
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center px-2 text-center text-[10px] text-muted-foreground">
                        {image.name}
                      </div>
                    )}
                    <div className="space-y-0.5 px-2 py-1.5">
                      <p className="truncate text-[10px] text-foreground">{image.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatFileSize(image.size)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{messages.barcodeTitle}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{messages.barcodeDescription}</p>
          </div>

          <Link className={buttonVariants({ className: "w-full" })} href="/device-services/scan">
            {messages.barcodeOpenScanner}
          </Link>
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{messages.notificationTitle}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{messages.notificationDescription}</p>
          </div>
          <Button
            disabled={!notificationAvailable || notificationState === "opening"}
            onClick={handleSendNotification}
            variant="outline"
          >
            {notificationState === "opening"
              ? messages.opening
              : messages.notificationSend}
          </Button>
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{messages.permissions}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{messages.permissionDescription}</p>
          </div>
          <dl className="grid gap-2 text-xs">
            {permissionKinds.map((kind) => (
              <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-border/70 px-3 py-3" key={kind}>
                <div className="min-w-0">
                  <dt className="text-muted-foreground">
                    {getPermissionLabel(kind, messages)}
                  </dt>
                  <dd className="font-medium text-foreground">
                    {getPermissionStatusLabel(permissions[kind], messages)}
                  </dd>
                </div>
                <Button
                  disabled={
                    permissionState[kind] === "opening" ||
                    (imageState === "opening" && Boolean(getPickerManagedPermissionSource(kind)))
                  }
                  onClick={() => handleRequestPermission(kind)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {permissionState[kind] === "opening"
                    ? messages.opening
                    : isPickerManagedPermission(permissions[kind])
                      ? messages.permissionActionDrivenShort
                      : messages.requestPermission}
                </Button>
              </div>
            ))}
          </dl>
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{messages.keyboardTitle}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{messages.keyboardDescription}</p>
          </div>
          <Input
            id="native-keyboard-test"
            inputMode="text"
            placeholder={messages.keyboardPlaceholder}
          />
        </div>
      </SurfaceCard>

      <div className="grid gap-2">
        <Link className={buttonVariants({ className: "w-full" })} href="/download">
          {messages.openDownloads}
        </Link>
      </div>

      {externalState === "opened" ||
      webViewState === "opened" ||
      mapState === "opened" ||
      imageState === "opened" ||
      notificationState === "opened" ? (
        <p className="text-xs leading-5 text-muted-foreground">{messages.opened}</p>
      ) : null}
      {imageState === "cancelled" ? (
        <p className="text-xs leading-5 text-muted-foreground">{messages.cancelled}</p>
      ) : null}
      {externalState === "failed" ||
      webViewState === "failed" ||
      mapState === "failed" ||
      imageState === "failed" ||
      notificationState === "failed" ? (
        <p className="text-xs leading-5 text-destructive">{messages.failed}</p>
      ) : null}
      {visibleLastMessage ? (
        <p className="break-words rounded-lg bg-secondary px-3 py-2 text-xs leading-5 text-muted-foreground">
          {visibleLastMessage}
        </p>
      ) : null}

      {mapPickerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/45 px-0"
          onClick={() => setMapPickerOpen(false)}
          role="presentation"
        >
          <div
            aria-modal="true"
            className="w-full rounded-t-3xl border border-border/80 bg-background px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                {messages.mapPickerTitle}
              </h3>
              <p className="text-xs leading-5 text-muted-foreground">
                {getMapPickerDescription(mapPickerState, messages)}
              </p>
            </div>

            <div className="mt-4 grid gap-2">
              {getSortedMapCandidates(
                mapCandidates.length > 0
                  ? mapCandidates
                  : createFallbackMapCandidates(),
              ).map((candidate: MapCandidateView) => {
                const disabled =
                  mapState === "opening" ||
                  candidate.checking ||
                  !isMapCandidateActionable(candidate);
                return (
                  <button
                    aria-label={getMapActionAccessibilityLabel(candidate, messages)}
                    className={cn(
                      "flex min-h-14 items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                      disabled
                        ? "border-border/60 bg-secondary/50 text-muted-foreground"
                        : "border-border bg-background text-foreground active:bg-secondary",
                    )}
                    disabled={disabled}
                    key={candidate.appType}
                    onClick={() => handleOpenMapCandidate(candidate)}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {candidate.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {candidate.checking
                          ? messages.mapChecking
                          : getMapCandidateHint(candidate, messages) ??
                            getMapInstallLabel(candidate.status, messages)}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {getMapStatusText(candidate, messages)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                disabled={mapRefreshing}
                onClick={() => refreshMapCandidates()}
                type="button"
                variant="outline"
              >
                {mapRefreshing ? messages.opening : messages.mapRefresh}
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
