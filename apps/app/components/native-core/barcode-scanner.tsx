"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { UseBarcodeScannerReturn } from "@/lib/native-core";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type BarcodeScannerControlLabels = {
  title?: ReactNode;
  idle: ReactNode;
  start: ReactNode;
  stop: ReactNode;
  opening: ReactNode;
  chooseImage: ReactNode;
  imageScanning: ReactNode;
};

export function BarcodeScannerControl({
  className,
  errorMessage,
  labels,
  scanner,
}: {
  className?: string;
  errorMessage?: ReactNode;
  labels: BarcodeScannerControlLabels;
  scanner: UseBarcodeScannerReturn;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraSessionRef = useRef(false);
  const [cameraLayerOpen, setCameraLayerOpen] = useState(false);

  function handleCameraAction() {
    if (scanner.isScanning) {
      void closeCameraLayer();
      return;
    }

    setCameraLayerOpen(true);
    window.requestAnimationFrame(() => {
      cameraSessionRef.current = true;
      void scanner.startCameraScan().catch(() => {
        cameraSessionRef.current = false;
        setCameraLayerOpen(false);
      });
    });
  }

  function handleImageAction() {
    fileInputRef.current?.click();
  }

  async function handleImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    const result = await scanner.scanImageFile(file);

    if (result && cameraLayerOpen) {
      await closeCameraLayer();
    }
  }

  const cameraLabel = scanner.isScanning
    ? labels.stop
    : scanner.state === "starting" || scanner.state === "stopping"
      ? labels.opening
      : labels.start;
  const showCameraLayer =
    cameraLayerOpen ||
    scanner.state === "starting" ||
    scanner.state === "scanning" ||
    scanner.state === "stopping";

  useEffect(() => {
    if (
      !cameraLayerOpen ||
      !cameraSessionRef.current ||
      scanner.state === "starting" ||
      scanner.state === "scanning" ||
      scanner.state === "stopping"
    ) {
      return;
    }

    cameraSessionRef.current = false;
    setCameraLayerOpen(false);
  }, [cameraLayerOpen, scanner.state]);

  async function closeCameraLayer() {
    cameraSessionRef.current = false;
    await scanner.stopCameraScan({ expected: true, clear: true });
    setCameraLayerOpen(false);
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Button
        className="w-full"
        disabled={scanner.isCameraBusy || scanner.isImageBusy}
        onClick={handleCameraAction}
      >
        {cameraLabel}
      </Button>

      <input
        accept="image/*"
        className="hidden"
        onChange={handleImageFileChange}
        ref={fileInputRef}
        type="file"
      />
      <div className="hidden" id={scanner.imageScannerElementId} />

      {showCameraLayer ? (
        <div className="fixed inset-0 z-50 bg-background text-foreground">
          <div className="mx-auto flex h-full min-h-0 w-full max-w-[28rem] flex-col overflow-hidden bg-background">
            <div className="border-b border-border/70 bg-background/95 px-4 pb-3 pt-[calc(var(--rtnn-safe-top)+0.75rem)]">
              <div className="min-w-0">
                {labels.title ? (
                  <h2 className="truncate text-base font-semibold">{labels.title}</h2>
                ) : null}
                <p className="truncate text-xs text-muted-foreground">{labels.idle}</p>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
              <div
                className="rtnn-barcode-camera-host absolute inset-0"
                id={scanner.scannerElementId}
                suppressHydrationWarning
              />
              {scanner.state === "starting" ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/35 px-8 text-center text-sm leading-6 text-white/80">
                  {labels.opening}
                </div>
              ) : null}
              {scanner.imageScanState === "scanning" ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 px-8 text-center text-sm leading-6 text-white/86">
                  {labels.imageScanning}
                </div>
              ) : null}
            </div>

            <div className="border-t border-border/70 bg-background/95 px-4 pb-[calc(var(--rtnn-safe-bottom)+1rem)] pt-3">
              {errorMessage ? (
                <p className="mb-3 rounded-xl bg-secondary px-3 py-2 text-xs leading-5 text-muted-foreground">
                  {errorMessage}
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  disabled={
                    scanner.state === "starting" ||
                    scanner.state === "stopping" ||
                    scanner.isImageBusy
                  }
                  onClick={handleImageAction}
                  type="button"
                  variant="outline"
                >
                  {scanner.imageScanState === "scanning"
                    ? labels.imageScanning
                    : labels.chooseImage}
                </Button>
                <Button
                  className="h-12"
                  disabled={scanner.state === "stopping"}
                  onClick={() => void closeCameraLayer()}
                  type="button"
                >
                  {labels.stop}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
