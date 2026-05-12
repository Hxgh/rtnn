"use client";

import type {
  Html5Qrcode,
  Html5QrcodeCameraScanConfig,
  Html5QrcodeResult,
} from "html5-qrcode";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearScanner,
  createAppNativeCore,
  createHtml5QrcodeScanner,
  getScannerBoxSize,
  isNativeActionCancelled,
  normalizeWebBarcodeResult,
  scanBarcodeImageFile,
  scannerElementId,
  type NativeBarcodeScanActionResult,
  type NativeRuntimeSnapshot,
  type WebBarcodeScanResult,
} from "@/lib/native-core";
import type { AppMessages } from "@/lib/i18n";
import { Button, buttonVariants } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";

type ScannerMessages = AppMessages["nativeCapabilities"];
type ScannerState =
  | "idle"
  | "starting"
  | "scanning"
  | "native-scanning"
  | "stopping"
  | "failed";
type ImageScanState = "idle" | "opening" | "scanning";

const imagePickerResetDelayMs = 900;
const nativeBarcodeScanTimeoutMs = 60_000;

function getResultTypeLabel(
  type: WebBarcodeScanResult["contentType"],
  messages: ScannerMessages,
) {
  return messages.barcodeContentTypeLabels[type] ?? messages.barcodeContentTypeLabels.text;
}

function getScannerErrorMessage(reason: string | null, messages: ScannerMessages) {
  if (!reason) {
    return null;
  }

  if (
    reason.includes("NotAllowedError") ||
    reason.includes("Permission") ||
    reason === "camera-permission-denied"
  ) {
    return messages.barcodeCameraDenied;
  }

  if (reason === "barcode-not-found") {
    return messages.barcodeNoResult;
  }

  if (reason === "barcode-detector-unavailable" || reason === "barcode-image-unsupported") {
    return messages.barcodeImageUnsupported;
  }

  return messages.failed;
}

function canOpenScanResult(result: WebBarcodeScanResult | null) {
  return result?.contentType === "url";
}

function hasAndroidBarcodeBridge() {
  const scope = globalThis as unknown as {
    AndroidBarcode?: {
      scanBarcode?: unknown;
    };
  };

  return typeof scope.AndroidBarcode?.scanBarcode === "function";
}

function isNativeBarcodeRuntime(snapshot: NativeRuntimeSnapshot | null) {
  return (
    (snapshot?.clientInfo.runtime === "tauri" &&
      snapshot.capabilities.barcodeScan) ||
    hasAndroidBarcodeBridge()
  );
}

function normalizeNativeBarcodeResult(
  result: NativeBarcodeScanActionResult,
): WebBarcodeScanResult | null {
  const code = result.codes.find((item) => item.rawValue.trim());

  if (!code) {
    return null;
  }

  return {
    ...normalizeWebBarcodeResult(code.rawValue),
    format: code.format,
  };
}

export function BarcodeScannerPanel({
  messages,
}: {
  messages: ScannerMessages;
}) {
  const nativeCoreRef = useRef(createAppNativeCore());
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const completedRef = useRef(false);
  const [state, setState] = useState<ScannerState>("idle");
  const [imageScanState, setImageScanState] = useState<ImageScanState>("idle");
  const [runtimeSnapshot, setRuntimeSnapshot] =
    useState<NativeRuntimeSnapshot | null>(null);
  const [lastResult, setLastResult] = useState<WebBarcodeScanResult | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    nativeCoreRef.current
      .getRuntimeSnapshot()
      .then((snapshot) => {
        if (active) {
          setRuntimeSnapshot(snapshot);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const shouldUseNativeBarcode = useCallback(async () => {
    if (isNativeBarcodeRuntime(runtimeSnapshot)) {
      return true;
    }

    try {
      const snapshot = await nativeCoreRef.current.getRuntimeSnapshot();
      setRuntimeSnapshot(snapshot);
      return isNativeBarcodeRuntime(snapshot);
    } catch {
      return hasAndroidBarcodeBridge();
    }
  }, [runtimeSnapshot]);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;

    if (!scanner) {
      setState((current) => (current === "stopping" ? "idle" : current));
      return;
    }

    setState("stopping");

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      clearScanner(scanner);
    } catch {
      // stop/clear can throw if the browser already revoked camera access.
    } finally {
      scannerRef.current = null;
      setState("idle");
    }
  }, []);

  const handleSuccess = useCallback(
    async (decodedText: string, result: Html5QrcodeResult) => {
      if (completedRef.current) {
        return;
      }

      completedRef.current = true;
      setLastResult(normalizeWebBarcodeResult(decodedText, result));
      setErrorReason(null);
      await stopScanner();
    },
    [stopScanner],
  );

  const applyNativeResult = useCallback(
    (result: NativeBarcodeScanActionResult) => {
      const normalized = normalizeNativeBarcodeResult(result);

      if (result.ok && normalized) {
        setLastResult(normalized);
        setErrorReason(null);
        return;
      }

      if (isNativeActionCancelled(result)) {
        setErrorReason(null);
        return;
      }

      setErrorReason(result.reason ?? "barcode-not-found");
    },
    [],
  );

  const startScanner = useCallback(async () => {
    if (state === "starting" || state === "scanning" || state === "native-scanning") {
      return;
    }

    setState("starting");
    setErrorReason(null);
    completedRef.current = false;

    try {
      if (await shouldUseNativeBarcode()) {
        setState("native-scanning");
        const result = await nativeCoreRef.current.scanBarcode({
          source: "camera",
          timeoutMs: nativeBarcodeScanTimeoutMs,
        });
        applyNativeResult(result);
        setState("idle");
        return;
      }

      const permission = await nativeCoreRef.current.ensureActionPermissions("barcode.scan");
      if (!permission.ok) {
        setErrorReason(permission.reason ?? "camera-permission-denied");
        setState("idle");
        return;
      }

      await stopScanner();
      const { scanner } = await createHtml5QrcodeScanner(scannerElementId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: getScannerBoxSize,
          aspectRatio: 1,
          disableFlip: false,
        } satisfies Html5QrcodeCameraScanConfig,
        (decodedText, result) => {
          void handleSuccess(decodedText, result);
        },
        undefined,
      );
      setState("scanning");
    } catch (error) {
      setErrorReason(error instanceof Error ? error.message : String(error));
      setState("failed");
      await stopScanner();
    }
  }, [
    applyNativeResult,
    handleSuccess,
    shouldUseNativeBarcode,
    state,
    stopScanner,
  ]);

  async function handleScanFromImage() {
    if (imageScanState !== "idle") {
      return;
    }

    setErrorReason(null);

    if (await shouldUseNativeBarcode()) {
      setImageScanState("scanning");

      try {
        const result = await nativeCoreRef.current.scanBarcode({
          source: "image",
          timeoutMs: nativeBarcodeScanTimeoutMs,
        });
        applyNativeResult(result);
      } catch (error) {
        setErrorReason(error instanceof Error ? error.message : String(error));
      } finally {
        setImageScanState("idle");
      }

      return;
    }

    setImageScanState("opening");
    fileInputRef.current?.click();
    window.setTimeout(() => {
      setImageScanState((current) => (current === "opening" ? "idle" : current));
    }, imagePickerResetDelayMs);
  }

  async function handleImageFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) {
      setImageScanState("idle");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorReason("barcode-image-unsupported");
      setImageScanState("idle");
      return;
    }

    setErrorReason(null);
    setImageScanState("scanning");

    try {
      const result = await scanBarcodeImageFile(file);
      setLastResult(result);
      setErrorReason(null);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      setErrorReason(
        reason.includes("No barcode or QR code detected")
          ? "barcode-not-found"
          : reason,
      );
    } finally {
      setImageScanState("idle");
    }
  }

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner?.isScanning) {
        void scanner.stop().catch(() => {});
      }
      try {
        if (scanner) {
          clearScanner(scanner);
        }
      } catch {
        // Ignore cleanup errors on route transitions.
      }
    };
  }, []);

  const displayError = getScannerErrorMessage(errorReason, messages);
  const isCameraBusy =
    state === "starting" ||
    state === "native-scanning" ||
    state === "stopping";
  const isScanning = state === "scanning";
  const isImageBusy = imageScanState !== "idle";
  const useNativeScanner = isNativeBarcodeRuntime(runtimeSnapshot);

  async function copyResult() {
    if (!lastResult) {
      return;
    }

    await navigator.clipboard?.writeText(lastResult.rawValue).catch(() => {});
  }

  function openResult() {
    const result = lastResult;

    if (!result || result.contentType !== "url") {
      return;
    }

    window.open(result.rawValue, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-5">
      <SurfaceCard className="overflow-hidden">
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">
              {messages.barcodeCameraTitle}
            </h2>
            <p className="text-xs leading-5 text-muted-foreground">
              {messages.barcodeCameraDescription}
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-black">
            <div
              className="relative aspect-square w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
              id={scannerElementId}
            >
              {state !== "scanning" && state !== "starting" ? (
                <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm leading-6 text-white/72">
                  {state === "native-scanning"
                    ? messages.barcodeScanning
                    : useNativeScanner
                      ? messages.barcodeNativeIdle
                      : messages.barcodeCameraIdle}
                </div>
              ) : null}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="size-56 rounded-[2rem] border border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.26)]" />
              </div>
            </div>
          </div>

          <p className="text-xs leading-5 text-muted-foreground">
            {messages.barcodePrivacyHint}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={isCameraBusy || isImageBusy}
              onClick={isScanning ? stopScanner : startScanner}
            >
              {isScanning
                ? messages.barcodeStop
                : state === "native-scanning"
                  ? messages.barcodeScanning
                : state === "starting"
                  ? messages.opening
                  : messages.barcodeStart}
            </Button>
            <Button
              disabled={isCameraBusy || isScanning || isImageBusy}
              onClick={handleScanFromImage}
              variant="outline"
            >
              {imageScanState === "scanning"
                ? messages.barcodeImageScanning
                : imageScanState === "opening"
                  ? messages.opening
                  : messages.barcodeScanFromImage}
            </Button>
          </div>
          <input
            accept="image/*"
            className="hidden"
            onChange={handleImageFileChange}
            ref={fileInputRef}
            type="file"
          />
          <div className="hidden" id={`${scannerElementId}-image`} />
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="space-y-3 px-4 py-4">
          <h2 className="text-sm font-semibold text-foreground">{messages.barcodeResult}</h2>
          {lastResult ? (
            <dl className="grid gap-2 text-sm">
              <div className="grid grid-cols-[5rem_1fr] gap-3">
                <dt className="text-muted-foreground">{messages.barcodeContentType}</dt>
                <dd className="text-foreground">{getResultTypeLabel(lastResult.contentType, messages)}</dd>
              </div>
              <div className="grid grid-cols-[5rem_1fr] gap-3">
                <dt className="text-muted-foreground">{messages.barcodeFormat}</dt>
                <dd className="text-foreground">{lastResult.format ?? "-"}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-muted-foreground">{messages.barcodeContent}</dt>
                <dd className="break-words rounded-xl bg-secondary px-3 py-2 text-foreground">
                  {lastResult.rawValue}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">{messages.barcodeNoResult}</p>
          )}
          {displayError ? (
            <p className="rounded-xl bg-secondary px-3 py-2 text-xs leading-5 text-muted-foreground">
              {displayError}
            </p>
          ) : null}
          {lastResult ? (
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={copyResult} type="button" variant="outline">
                {messages.barcodeCopyResult}
              </Button>
              <Button
                disabled={!canOpenScanResult(lastResult)}
                onClick={openResult}
                type="button"
                variant="outline"
              >
                {messages.barcodeOpenResult}
              </Button>
            </div>
          ) : null}
        </div>
      </SurfaceCard>

      <Link className={buttonVariants({ variant: "ghost", className: "w-full" })} href="/device-services">
        {messages.backToDeviceServices}
      </Link>
    </div>
  );
}
