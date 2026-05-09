"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  createAppNativeCore,
  type NativeCoreActionResult,
  type NativeCoreClientInfo,
  type NativeCoreMapAppType,
  type NativeCoreMapCandidate,
  type NativeCorePermissionKind,
  type NativeCorePermissionResult,
  type NativeCorePickedFile,
  type NativeCoreService,
} from "@/lib/native-core";
import type { AppMessages } from "@/lib/i18n";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SurfaceCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type NativeCapabilitiesMessages = AppMessages["nativeCapabilities"];

type ActionState = "idle" | "opening" | "opened" | "cancelled" | "failed";
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

function formatList(values?: string[]) {
  return values?.length ? values.join(", ") : "-";
}

function isOpened(result: NativeCoreActionResult) {
  return result.ok;
}

function isCancelled(result: NativeCoreActionResult) {
  return result.reason === "file-picker-cancelled" || result.reason === "file-picker-timeout";
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
  });
  const [externalState, setExternalState] = useState<ActionState>("idle");
  const [mapState, setMapState] = useState<ActionState>("idle");
  const [imageState, setImageState] = useState<ActionState>("idle");
  const [mapCandidates, setMapCandidates] = useState<NativeCoreMapCandidate[]>([]);
  const [selectedMapApp, setSelectedMapApp] =
    useState<NativeCoreMapAppType>("amap");
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
        if (!active) {
          return;
        }

        setMapCandidates(candidates);
        setSelectedMapApp(
          candidates.find((item) => item.available)?.appType ??
            candidates[0]?.appType ??
            "amap",
        );
      })
      .catch(() => {
        if (active) {
          const fallback = [
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
          setMapCandidates(fallback);
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
  const selectedCandidate = mapCandidates.find(
    (item) => item.appType === selectedMapApp,
  );
  const canOpenSelectedMap =
    mapAvailable && (!selectedCandidate || selectedCandidate.available);

  async function runAction(
    setState: (state: ActionState) => void,
    action: () => Promise<NativeCoreActionResult>,
  ) {
    setState("opening");
    setLastMessage(null);

    try {
      const result = await action();
      setLastMessage(result.message ?? result.reason ?? null);
      setState(isOpened(result) ? "opened" : isCancelled(result) ? "cancelled" : "failed");
    } catch (error) {
      setLastMessage(error instanceof Error ? error.message : String(error));
      setState("failed");
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
    setPermissionState((current) => ({ ...current, [kind]: "opening" }));

    try {
      const result = await nativeCore.ensurePermission(kind);

      setPermissions((current) => ({
        ...current,
        [kind]: result,
      }));
      setPermissionState((current) => ({
        ...current,
        [kind]: result.ok ? "opened" : "failed",
      }));
    } catch {
      setPermissionState((current) => ({ ...current, [kind]: "failed" }));
    }
  }

  async function handlePickImages() {
    setImageState("opening");
    setLastMessage(null);

    try {
      const result = await nativeCore.pickMedia("album");

      setLastMessage(result.reason ?? result.message ?? null);

      if (result.ok) {
        setImages(result.files);
        setImageState("opened");
        void refreshPermissionsFor(["photo-library"]).catch(() => {});
        return;
      }

      setImageState(isCancelled(result) ? "cancelled" : "failed");
    } catch (error) {
      setLastMessage(error instanceof Error ? error.message : String(error));
      setImageState("failed");
    }
  }

  async function handleCaptureImage() {
    setImageState("opening");
    setLastMessage(null);

    try {
      const result = await nativeCore.pickMedia("camera");

      setLastMessage(result.reason ?? result.message ?? null);

      if (result.ok) {
        setImages(result.files);
        setImageState("opened");
        void refreshPermissionsFor(["photo-library", "camera"]).catch(() => {});
        return;
      }

      setImageState(isCancelled(result) ? "cancelled" : "failed");
    } catch (error) {
      setLastMessage(error instanceof Error ? error.message : String(error));
      setImageState("failed");
    }
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
              runAction(setExternalState, () =>
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

          <div className="grid gap-2">
            {mapCandidates.length > 0
              ? mapCandidates.map((candidate) => (
                  <button
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                      candidate.appType === selectedMapApp
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-foreground active:bg-secondary",
                      !candidate.available && "opacity-55",
                    )}
                    disabled={!candidate.available}
                    key={candidate.appType}
                    onClick={() => setSelectedMapApp(candidate.appType)}
                    type="button"
                  >
                    <span className="text-sm font-medium">{candidate.label}</span>
                    <span className="text-xs opacity-80">
                      {getMapInstallLabel(candidate.status, messages)}
                    </span>
                  </button>
                ))
              : null}
          </div>

          <Button
            disabled={!canOpenSelectedMap || mapState === "opening"}
            onClick={() =>
              runAction(setMapState, () =>
                nativeCore.openMapNavigation({
                  ...mapTarget,
                  appType: selectedMapApp,
                }),
              )
            }
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
              onClick={handlePickImages}
              variant="outline"
            >
              {imageState === "opening" ? messages.opening : messages.pickImages}
            </Button>
            <Button
              disabled={!imagePickerAvailable || imageState === "opening"}
              onClick={handleCaptureImage}
              variant="outline"
            >
              {imageState === "opening" ? messages.opening : messages.captureImage}
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
                  disabled={permissionState[kind] === "opening"}
                  onClick={() => handleRequestPermission(kind)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {permissionState[kind] === "opening"
                    ? messages.opening
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

      {externalState === "opened" || mapState === "opened" || imageState === "opened" ? (
        <p className="text-xs leading-5 text-muted-foreground">{messages.opened}</p>
      ) : null}
      {imageState === "cancelled" ? (
        <p className="text-xs leading-5 text-muted-foreground">{messages.cancelled}</p>
      ) : null}
      {externalState === "failed" || mapState === "failed" || imageState === "failed" ? (
        <p className="text-xs leading-5 text-destructive">{messages.failed}</p>
      ) : null}
      {lastMessage ? (
        <p className="break-words rounded-lg bg-secondary px-3 py-2 text-xs leading-5 text-muted-foreground">
          {lastMessage}
        </p>
      ) : null}
    </div>
  );
}
