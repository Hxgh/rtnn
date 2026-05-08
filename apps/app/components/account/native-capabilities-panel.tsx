"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  createNativeCapabilityCore,
  hasNativeFeature,
  type NativeBridgeActionResult,
  type NativeClientInfo,
  type NativePermissionKind,
  type NativePermissionResult,
  type NativePickedFile,
} from "@rtnn/native-bridge";
import type { AppMessages } from "@/lib/i18n";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SurfaceCard } from "@/components/ui/card";

type NativeCapabilitiesMessages = AppMessages["nativeCapabilities"];

type ActionState = "idle" | "opening" | "opened" | "failed";
type VisiblePermissionKind = Extract<
  NativePermissionKind,
  "photo-library" | "camera" | "notification"
>;

const mapTarget = {
  lat: 30.2741,
  lng: 120.1551,
  name: "杭州西湖",
  appType: "amap" as const,
};
const permissionKinds: VisiblePermissionKind[] = [
  "photo-library",
  "camera",
  "notification",
];
const emptyPermissions: Record<VisiblePermissionKind, NativePermissionResult | null> = {
  "photo-library": null,
  camera: null,
  notification: null,
};

function formatList(values?: string[]) {
  return values?.length ? values.join(", ") : "-";
}

function isOpened(result: NativeBridgeActionResult) {
  return result.ok;
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
  result: NativePermissionResult | null,
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

export function NativeCapabilitiesPanel({
  messages,
}: {
  messages: NativeCapabilitiesMessages;
}) {
  const nativeCore = useMemo(() => createNativeCapabilityCore(), []);
  const [clientInfo, setClientInfo] = useState<NativeClientInfo | null>(null);
  const [externalState, setExternalState] = useState<ActionState>("idle");
  const [mapState, setMapState] = useState<ActionState>("idle");
  const [imageState, setImageState] = useState<ActionState>("idle");
  const [permissionState, setPermissionState] = useState<
    Record<VisiblePermissionKind, ActionState>
  >({
    "photo-library": "idle",
    camera: "idle",
    notification: "idle",
  });
  const [images, setImages] = useState<NativePickedFile[]>([]);
  const [permissions, setPermissions] =
    useState<Record<VisiblePermissionKind, NativePermissionResult | null>>(
      emptyPermissions,
    );

  useEffect(() => {
    let active = true;

    nativeCore
      .getClientInfo()
      .then((info) => {
        if (active) {
          setClientInfo(info);
        }
      })
      .catch(() => {
        if (active) {
          setClientInfo(null);
        }
      });

    Promise.all(
      permissionKinds.map(async (kind) => ({
        kind,
        result: await nativeCore.checkPermission({ kind, trigger: "startup" }),
      })),
    )
      .then((results) => {
        if (!active) {
          return;
        }

        setPermissions((current) => ({
          ...current,
          ...Object.fromEntries(
            results.map(({ kind, result }) => [kind, result]),
          ),
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

  const externalAvailable =
    !clientInfo ||
    clientInfo.runtime === "browser" ||
    hasNativeFeature(clientInfo, "external.open");
  const mapAvailable =
    !clientInfo ||
    clientInfo.runtime === "browser" ||
    hasNativeFeature(clientInfo, "map.navigation");
  const imagePickerAvailable =
    !clientInfo ||
    clientInfo.runtime === "browser" ||
    hasNativeFeature(clientInfo, "file.pick");

  async function runAction(
    setState: (state: ActionState) => void,
    action: () => Promise<NativeBridgeActionResult>,
  ) {
    setState("opening");

    try {
      setState(isOpened(await action()) ? "opened" : "failed");
    } catch {
      setState("failed");
    }
  }

  async function refreshPermissionsFor(kinds: VisiblePermissionKind[]) {
    const results = await Promise.all(
      kinds.map(async (kind) => ({
        kind,
        result: await nativeCore.checkPermission({ kind, trigger: "manual" }),
      })),
    );

    setPermissions((current) => ({
      ...current,
      ...Object.fromEntries(results.map(({ kind, result }) => [kind, result])),
    }));
  }

  async function handleRequestPermission(kind: VisiblePermissionKind) {
    setPermissionState((current) => ({ ...current, [kind]: "opening" }));

    try {
      const result = await nativeCore.ensurePermission({
        kind,
        trigger: "on-demand",
      });

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

    try {
      const result = await nativeCore.pickImages({
        accept: "image/*",
        maxFiles: 3,
        multiple: true,
        readAsDataUrl: true,
      });

      if (result.ok) {
        setImages(result.files);
        setImageState("opened");
        void refreshPermissionsFor(["photo-library"]).catch(() => {});
        return;
      }

      setImageState("failed");
    } catch {
      setImageState("failed");
    }
  }

  async function handleCaptureImage() {
    setImageState("opening");

    try {
      const result = await nativeCore.pickImages({
        accept: "image/*",
        capture: "environment",
        maxFiles: 1,
        multiple: false,
        readAsDataUrl: true,
      });

      if (result.ok) {
        setImages(result.files);
        setImageState("opened");
        void refreshPermissionsFor(["photo-library", "camera"]).catch(() => {});
        return;
      }

      setImageState("failed");
    } catch {
      setImageState("failed");
    }
  }

  return (
    <SurfaceCard className="overflow-hidden">
      <div className="space-y-4 px-4 py-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">{messages.title}</h2>
          <p className="text-xs leading-5 text-muted-foreground">{messages.description}</p>
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

        <div className="grid gap-2">
          <Button
            disabled={!externalAvailable || externalState === "opening"}
            onClick={() =>
              runAction(setExternalState, () =>
                nativeCore.openExternal({ url: resolveExternalCheckUrl() }),
              )
            }
            variant="outline"
          >
            {externalState === "opening" ? messages.opening : messages.openExternal}
          </Button>
          <Button
            disabled={!mapAvailable || mapState === "opening"}
            onClick={() =>
              runAction(setMapState, () =>
                nativeCore.openMapNavigation(mapTarget),
              )
            }
            variant="outline"
          >
            {mapState === "opening" ? messages.opening : messages.openMap}
          </Button>
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
          <Link className={buttonVariants({ className: "w-full" })} href="/download">
            {messages.openDownloads}
          </Link>
        </div>

        <div className="space-y-2 rounded-lg border border-border/80 bg-secondary/40 px-3 py-3">
          <p className="text-xs font-medium text-muted-foreground">{messages.permissions}</p>
          <dl className="grid gap-2 text-xs">
            {permissionKinds.map((kind) => (
              <div className="grid grid-cols-[1fr_auto] items-center gap-3" key={kind}>
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

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="native-keyboard-test">
            {messages.keyboardLabel}
          </label>
          <Input
            id="native-keyboard-test"
            inputMode="text"
            placeholder={messages.keyboardPlaceholder}
          />
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

        {externalState === "opened" || mapState === "opened" || imageState === "opened" ? (
          <p className="text-xs leading-5 text-muted-foreground">{messages.opened}</p>
        ) : null}
        {externalState === "failed" || mapState === "failed" || imageState === "failed" ? (
          <p className="text-xs leading-5 text-destructive">{messages.failed}</p>
        ) : null}
      </div>
    </SurfaceCard>
  );
}
