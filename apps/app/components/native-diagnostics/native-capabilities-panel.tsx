"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAppNativeCore,
  isMapDetectionUncertain,
  isNativeActionCancelled,
  runNativeActionWithWatchdog,
  type NativeCoreActionResult,
  type NativeCoreClientInfo,
  type NativeCoreBarcode,
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
type BusyAction =
  | "external"
  | "map"
  | "image"
  | "barcode"
  | "notification"
  | null;
type VisiblePermissionKind = Extract<
  NativeCorePermissionKind,
  "photo-library" | "camera" | "notification"
>;

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
const barcodeScanTimeoutMs = 18_000;
const transientActionStateMs = 1_200;
const nativeActionDispatchStateMs = 1_800;

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
    available: true,
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

function formatList(values?: string[]) {
  return values?.length ? values.join(", ") : "-";
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

  return messages.mapUnknown;
}

function getMapCandidateHint(
  candidate: NativeCoreMapCandidate,
  messages: NativeCapabilitiesMessages,
) {
  if (candidate.reason === "map-app-not-installed-or-not-visible") {
    return messages.mapVisibilityLimited;
  }

  if (candidate.reason === "map-install-check-unavailable") {
    return messages.mapCheckUnavailable;
  }

  return candidate.reason;
}

function isMapCandidateActionable(candidate: NativeCoreMapCandidate) {
  return (
    candidate.status === "installed" ||
    candidate.status === "unknown" ||
    isMapDetectionUncertain(candidate)
  );
}

function isPickerManagedPermission(result: NativeCorePermissionResult | null) {
  return result?.reason === "permission-managed-by-file-picker";
}

function getPickerManagedPermissionSource(kind: VisiblePermissionKind) {
  if (kind === "photo-library") {
    return "album" as const;
  }

  if (kind === "camera") {
    return "camera" as const;
  }

  return null;
}

export function NativeCapabilitiesPanel({
  messages,
}: {
  messages: NativeCapabilitiesMessages;
}) {
  const nativeCore = useMemo<NativeCoreService>(() => createAppNativeCore(), []);
  const [clientInfo, setClientInfo] = useState<NativeCoreClientInfo | null>(null);
  const [capabilities, setCapabilities] = useState({
    externalOpen: true,
    mapNavigation: true,
    filePick: true,
    notification: true,
    barcodeScan: true,
  });
  const [externalState, setExternalState] = useState<ActionState>("idle");
  const [mapState, setMapState] = useState<ActionState>("idle");
  const [imageState, setImageState] = useState<ActionState>("idle");
  const [barcodeState, setBarcodeState] = useState<ActionState>("idle");
  const [notificationState, setNotificationState] =
    useState<ActionState>("idle");
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [activeMediaSource, setActiveMediaSource] =
    useState<NativeMediaSource | null>(null);
  const [mapCandidates, setMapCandidates] = useState<NativeCoreMapCandidate[]>([]);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
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
  const [barcodes, setBarcodes] = useState<NativeCoreBarcode[]>([]);
  const [permissions, setPermissions] =
    useState<Record<VisiblePermissionKind, NativeCorePermissionResult | null>>(
      emptyPermissions,
    );

  useEffect(() => {
    const entries: Array<[ActionState, (state: ActionState) => void]> = [
      [externalState, setExternalState],
      [mapState, setMapState],
      [imageState, setImageState],
      [barcodeState, setBarcodeState],
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
  }, [externalState, mapState, imageState, barcodeState, notificationState]);

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
        } else if (busyAction === "map") {
          setMapState((state) => (state === "opening" ? "opened" : state));
        } else if (busyAction === "image") {
          setImageState((state) => (state === "opening" ? "idle" : state));
          setActiveMediaSource(null);
        } else if (busyAction === "barcode") {
          setBarcodeState((state) => (state === "opening" ? "idle" : state));
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
    async (options: { silent?: boolean } = {}) => {
      if (!options.silent) {
        setMapRefreshing(true);
      }

      try {
        setMapCandidates(await nativeCore.getMapCandidates());
      } catch {
        setMapCandidates(createFallbackMapCandidates());
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
          setClientInfo(snapshot.clientInfo);
          setCapabilities(snapshot.capabilities);
        }
      })
      .catch(() => {
        if (active) {
          setClientInfo(null);
        }
      });

    nativeCore
      .getMapCandidates()
      .then((candidates: NativeCoreMapCandidate[]) => {
        if (active) {
          setMapCandidates(candidates);
        }
      })
      .catch(() => {
        if (active) {
          setMapCandidates(createFallbackMapCandidates());
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
  const mapAvailable = capabilities.mapNavigation;
  const imagePickerAvailable = capabilities.filePick;
  const barcodeAvailable = capabilities.barcodeScan;
  const notificationAvailable = capabilities.notification;
  const installedMapCount = mapCandidates.filter(
    (item) => item.status === "installed",
  ).length;
  const unknownMapCount = mapCandidates.filter(
    (item) => item.status === "unknown",
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
        await handlePickMedia(pickerSource);
      } finally {
        setPermissionState((current) => ({ ...current, [kind]: "idle" }));
      }
      return;
    }

    setPermissionState((current) => ({ ...current, [kind]: "opening" }));

    try {
      const result = await nativeCore.requestPermissionForDiagnostics(kind);

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

  async function handleScanBarcode() {
    setBarcodeState("opening");
    setBusyAction("barcode");
    setLastMessage(null);

    try {
      const result = await nativeCore.scanBarcode({
        timeoutMs: barcodeScanTimeoutMs,
      });

      setLastMessage(result.message ?? result.reason ?? null);
      setBarcodes(result.codes);
      setBarcodeState(
        result.ok ? "opened" : isCancelled(result) ? "cancelled" : "failed",
      );
      void refreshPermissionsFor(["camera"]).catch(() => {});
    } catch (error) {
      setLastMessage(error instanceof Error ? error.message : String(error));
      setBarcodeState("failed");
    } finally {
      setBusyAction((current) => (current === "barcode" ? null : current));
    }
  }

  async function handleSendNotification() {
    await runAction("notification", setNotificationState, () =>
      nativeCore.showTestNotification(),
    );
    void refreshPermissionsFor(["notification"]).catch(() => {});
  }

  async function handleOpenMapPicker() {
    setMapPickerOpen(true);
    setLastMessage(null);
    setMapCandidates(createCheckingMapCandidates());
    await refreshMapCandidates().catch(() => {});
  }

  async function handleOpenMapCandidate(candidate: NativeCoreMapCandidate) {
    if (!isMapCandidateActionable(candidate)) {
      setLastMessage(candidate.reason ?? candidate.status);
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
            <h2 className="text-sm font-semibold text-foreground">{messages.runtimeTitle}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{messages.runtimeDescription}</p>
          </div>

          <dl className="grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{messages.runtime}</dt>
              <dd>{clientInfo?.runtime ?? messages.browserRuntime}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{messages.platform}</dt>
              <dd>{clientInfo?.platform ?? "-"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{messages.shell}</dt>
              <dd>{clientInfo?.shell ?? "-"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">{messages.features}</dt>
              <dd className="break-words text-xs text-foreground">
                {formatList(clientInfo?.features)}
              </dd>
            </div>
          </dl>

          {clientInfo?.runtime !== "tauri" ? (
            <p className="text-xs leading-5 text-muted-foreground">{messages.unavailable}</p>
          ) : null}
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{messages.externalTitle}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{messages.externalDescription}</p>
          </div>
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
                <p>
                  {messages.mapDetected}: {installedMapCount} / {mapCandidates.length}
                  {unknownMapCount > 0 ? `, ${messages.mapUnknownCount}: ${unknownMapCount}` : ""}
                </p>
                {mapCandidates.some((item) => item.reason === "map-app-not-installed-or-not-visible") ? (
                  <p>{messages.mapVisibilityLimited}</p>
                ) : null}
              </div>
            ) : (
              <span>{messages.mapChecking}</span>
            )}
          </div>

          <Button
            disabled={!mapAvailable || mapState === "opening"}
            onClick={handleOpenMapPicker}
            variant="outline"
          >
            {mapState === "opening" ? messages.opening : messages.openMap}
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

          <Button
            disabled={!barcodeAvailable || barcodeState === "opening"}
            onClick={handleScanBarcode}
            variant="outline"
          >
            {barcodeState === "opening" ? messages.opening : messages.barcodeScan}
          </Button>

          <div className="rounded-xl border border-border/70 px-3 py-3 text-xs leading-5">
            <p className="font-medium text-muted-foreground">
              {barcodes.length > 0 ? messages.barcodeResult : messages.barcodeNoResult}
            </p>
            {barcodes.length > 0 ? (
              <div className="mt-2 grid gap-1">
                {barcodes.map((code, index) => (
                  <p
                    className="break-words text-foreground"
                    key={`${code.rawValue}:${code.format ?? "unknown"}:${index}`}
                  >
                    {code.format ? `${code.format}: ` : ""}
                    {code.rawValue}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
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
      mapState === "opened" ||
      imageState === "opened" ||
      barcodeState === "opened" ||
      notificationState === "opened" ? (
        <p className="text-xs leading-5 text-muted-foreground">{messages.opened}</p>
      ) : null}
      {imageState === "cancelled" || barcodeState === "cancelled" ? (
        <p className="text-xs leading-5 text-muted-foreground">{messages.cancelled}</p>
      ) : null}
      {externalState === "failed" ||
      mapState === "failed" ||
      imageState === "failed" ||
      barcodeState === "failed" ||
      notificationState === "failed" ? (
        <p className="text-xs leading-5 text-destructive">{messages.failed}</p>
      ) : null}
      {lastMessage ? (
        <p className="break-words rounded-lg bg-secondary px-3 py-2 text-xs leading-5 text-muted-foreground">
          {lastMessage}
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
                {messages.mapPickerDescription}
              </p>
            </div>

            <div className="mt-4 grid gap-2">
              {(mapCandidates.length > 0
                ? mapCandidates
                : createFallbackMapCandidates()
              ).map((candidate: MapCandidateView) => {
                const disabled =
                  mapState === "opening" ||
                  candidate.checking ||
                  !isMapCandidateActionable(candidate);
                const uncertain = isMapDetectionUncertain(candidate);

                return (
                  <button
                    className={cn(
                      "flex min-h-14 items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition-colors",
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
                          : getMapCandidateHint(candidate, messages)
                            ? `${getMapInstallLabel(candidate.status, messages)} · ${getMapCandidateHint(candidate, messages)}`
                            : getMapInstallLabel(candidate.status, messages)}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {candidate.checking
                        ? "-"
                        : candidate.status === "unknown"
                        ? messages.mapTryOpen
                        : candidate.status === "installed"
                          ? messages.mapOpenWith
                          : uncertain || isMapCandidateActionable(candidate)
                            ? messages.mapTryOpen
                          : "-"}
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
