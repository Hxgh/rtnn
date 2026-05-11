"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAppNativeCore,
  isNativeActionCancelled,
  runNativeActionWithWatchdog,
  type NativeCoreActionResult,
  type NativeCoreClientInfo,
  type NativeCoreMapCandidate,
  type NativeCorePermissionKind,
  type NativeCorePermissionResult,
  type NativeCorePickedFile,
  type NativeCoreService,
  type NativeMediaSource,
} from "@/lib/native-core";
import type { AppMessages } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SurfaceCard } from "@/components/ui/card";

type Messages = AppMessages["nativeCapabilities"];
type ActionState = "idle" | "opening" | "opened" | "cancelled" | "failed";
type BusyAction = "external" | "webview" | "image" | "notification" | null;
type VisiblePermissionKind = Extract<
  NativeCorePermissionKind,
  "photo-library" | "camera" | "notification"
>;
type RuntimeSnapshot = {
  clientInfo: NativeCoreClientInfo;
  capabilities: Record<string, boolean>;
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
const transientActionStateMs = 1_200;

function resolveDownloadUrl() {
  return new URL("/download", window.location.href).toString();
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

function formatFileSize(value: number) {
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function getPermissionLabel(kind: VisiblePermissionKind, messages: Messages) {
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
  messages: Messages,
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

function getActionMessage(reason: string | null, messages: Messages) {
  if (!reason) {
    return null;
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

  if (reason === "browser-open-unavailable" || reason === "webview-url-not-allowed") {
    return messages.webviewLoadFailed;
  }

  return null;
}

export function NativeDiagnosticsPanel({ messages }: { messages: Messages }) {
  const nativeCore = useMemo<NativeCoreService>(() => createAppNativeCore(), []);
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [externalState, setExternalState] = useState<ActionState>("idle");
  const [webViewState, setWebViewState] = useState<ActionState>("idle");
  const [imageState, setImageState] = useState<ActionState>("idle");
  const [notificationState, setNotificationState] =
    useState<ActionState>("idle");
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [activeMediaSource, setActiveMediaSource] =
    useState<NativeMediaSource | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [images, setImages] = useState<NativeCorePickedFile[]>([]);
  const [permissions, setPermissions] =
    useState<Record<VisiblePermissionKind, NativeCorePermissionResult | null>>(
      emptyPermissions,
    );
  const [mapCandidates, setMapCandidates] = useState<NativeCoreMapCandidate[]>([]);
  const visibleLastMessage = getActionMessage(lastMessage, messages);

  useEffect(() => {
    let active = true;

    nativeCore
      .getRuntimeSnapshot()
      .then((nextSnapshot) => {
        if (active) {
          setSnapshot(nextSnapshot);
        }
      })
      .catch(() => {});

    nativeCore
      .getMapCandidates()
      .then((candidates) => {
        if (active) {
          setMapCandidates(candidates);
        }
      })
      .catch(() => {});

    nativeCore
      .checkPermissions(permissionKinds)
      .then((nextPermissions) => {
        if (active) {
          setPermissions((current) => ({
            ...current,
            ...nextPermissions,
          }));
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [nativeCore]);

  useEffect(() => {
    const entries: Array<[ActionState, (state: ActionState) => void]> = [
      [externalState, setExternalState],
      [webViewState, setWebViewState],
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
  }, [externalState, webViewState, imageState, notificationState]);

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
      } else if (document.visibilityState === "visible") {
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

  const refreshPermissionsFor = useCallback(
    async (kinds: VisiblePermissionKind[]) => {
      const nextPermissions = await nativeCore.checkPermissions(kinds);

      setPermissions((current) => ({
        ...current,
        ...nextPermissions,
      }));
    },
    [nativeCore],
  );

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
        window.setTimeout(() => setState("idle"), 1_800);
      }
    } catch (error) {
      setLastMessage(error instanceof Error ? error.message : String(error));
      setState("failed");
    } finally {
      setBusyAction((current) => (current === actionType ? null : current));
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

  async function handleRequestPermission(kind: VisiblePermissionKind) {
    setLastMessage(null);

    try {
      const result = await nativeCore.requestPermission(kind);

      setPermissions((current) => ({
        ...current,
        [kind]: result,
      }));
      setLastMessage(result.message ?? result.reason ?? messages.permissionRequestDone);
    } catch (error) {
      setLastMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSendNotification() {
    await runAction("notification", setNotificationState, () =>
      nativeCore.showNotification(),
    );
    void refreshPermissionsFor(["notification"]).catch(() => {});
  }

  async function handleOpenInAppWebView() {
    await runAction("webview", setWebViewState, () => nativeCore.openUrl("/download"));
  }

  const clientInfo = snapshot?.clientInfo;
  const capabilityText = snapshot
    ? Object.entries(snapshot.capabilities)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key)
        .join(", ") || "-"
    : "-";

  return (
    <div className="space-y-5">
      <SurfaceCard className="overflow-hidden">
        <div className="space-y-3 px-4 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{messages.runtimeTitle}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{messages.runtimeDescription}</p>
          </div>
          <dl className="grid gap-2 text-xs">
            <div className="grid grid-cols-[5.5rem_1fr] gap-3">
              <dt className="text-muted-foreground">{messages.runtime}</dt>
              <dd className="text-foreground">{clientInfo?.runtime ?? "-"}</dd>
            </div>
            <div className="grid grid-cols-[5.5rem_1fr] gap-3">
              <dt className="text-muted-foreground">{messages.platform}</dt>
              <dd className="text-foreground">{clientInfo?.platform ?? "-"}</dd>
            </div>
            <div className="grid grid-cols-[5.5rem_1fr] gap-3">
              <dt className="text-muted-foreground">{messages.shell}</dt>
              <dd className="text-foreground">{clientInfo?.shell ?? "-"}</dd>
            </div>
            <div className="grid grid-cols-[5.5rem_1fr] gap-3">
              <dt className="text-muted-foreground">{messages.features}</dt>
              <dd className="break-words text-foreground">{capabilityText}</dd>
            </div>
          </dl>
          {clientInfo?.runtime === "browser" ? (
            <p className="rounded-xl bg-secondary px-3 py-2 text-xs leading-5 text-muted-foreground">
              {messages.unavailable}
            </p>
          ) : null}
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="space-y-4 px-4 py-4">
          <h2 className="text-sm font-semibold text-foreground">{messages.externalTitle}</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={webViewState === "opening"}
              onClick={handleOpenInAppWebView}
              variant="outline"
            >
              {webViewState === "opening" ? messages.opening : messages.openInAppWebView}
            </Button>
            <Button
              disabled={externalState === "opening"}
              onClick={() =>
                runAction("external", setExternalState, () =>
                  nativeCore.openExternalUrl(resolveDownloadUrl()),
                )
              }
              variant="outline"
            >
              {externalState === "opening" ? messages.opening : messages.openExternal}
            </Button>
          </div>
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
              disabled={imageState === "opening"}
              onClick={() => handlePickMedia("album")}
              variant="outline"
            >
              {imageState === "opening" && activeMediaSource === "album"
                ? messages.opening
                : messages.pickImages}
            </Button>
            <Button
              disabled={imageState === "opening"}
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
            <h2 className="text-sm font-semibold text-foreground">{messages.permissions}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{messages.permissionDescription}</p>
          </div>
          <dl className="grid gap-2 text-xs">
            {permissionKinds.map((kind) => (
              <div
                className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-border/70 px-3 py-3"
                key={kind}
              >
                <div className="min-w-0">
                  <dt className="text-muted-foreground">
                    {getPermissionLabel(kind, messages)}
                  </dt>
                  <dd className="font-medium text-foreground">
                    {getPermissionStatusLabel(permissions[kind], messages)}
                  </dd>
                </div>
                <Button
                  onClick={() => handleRequestPermission(kind)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {messages.requestPermission}
                </Button>
              </div>
            ))}
          </dl>
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{messages.mapDetected}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{messages.mapDiagnosticDescription}</p>
          </div>
          <dl className="grid gap-2 text-xs">
            {mapCandidates.map((candidate) => (
              <div
                className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-border/70 px-3 py-3"
                key={candidate.appType}
              >
                <dt className="font-medium text-foreground">{candidate.label}</dt>
                <dd className="text-muted-foreground">{candidate.status}</dd>
              </div>
            ))}
          </dl>
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{messages.notificationTitle}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{messages.notificationDescription}</p>
          </div>
          <Button
            disabled={notificationState === "opening"}
            onClick={handleSendNotification}
            variant="outline"
          >
            {notificationState === "opening" ? messages.opening : messages.notificationSend}
          </Button>
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{messages.keyboardTitle}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{messages.keyboardDescription}</p>
          </div>
          <Input
            id="native-keyboard-check"
            inputMode="text"
            placeholder={messages.keyboardPlaceholder}
          />
        </div>
      </SurfaceCard>

      {externalState === "opened" ||
      webViewState === "opened" ||
      imageState === "opened" ||
      notificationState === "opened" ? (
        <p className="text-xs leading-5 text-muted-foreground">{messages.opened}</p>
      ) : null}
      {imageState === "cancelled" ? (
        <p className="text-xs leading-5 text-muted-foreground">{messages.cancelled}</p>
      ) : null}
      {externalState === "failed" ||
      webViewState === "failed" ||
      imageState === "failed" ||
      notificationState === "failed" ? (
        <p className="text-xs leading-5 text-destructive">{messages.failed}</p>
      ) : null}
      {visibleLastMessage ? (
        <p className="break-words rounded-lg bg-secondary px-3 py-2 text-xs leading-5 text-muted-foreground">
          {visibleLastMessage}
        </p>
      ) : null}
    </div>
  );
}
