"use client";

import type {
  Html5Qrcode,
  Html5QrcodeCameraScanConfig,
  Html5QrcodeResult,
} from "html5-qrcode";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createAppNativeCore,
  createHtml5QrcodeScanner,
  getScannerBoxSize,
  normalizeWebBarcodeResult,
  scannerElementId,
  type NativeCoreActionResult,
  type WebBarcodeScanResult,
} from "@/lib/native-core";
import type { AppMessages } from "@/lib/i18n";
import { Button, buttonVariants } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";

type ScannerMessages = AppMessages["nativeCapabilities"];
type ScannerState = "idle" | "starting" | "scanning" | "stopping" | "failed";

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

  if (reason === "barcode-detector-unavailable") {
    return messages.barcodeImageUnsupported;
  }

  return messages.failed;
}

export function BarcodeScannerPanel({
  messages,
}: {
  messages: ScannerMessages;
}) {
  const nativeCoreRef = useRef(createAppNativeCore());
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const completedRef = useRef(false);
  const [state, setState] = useState<ScannerState>("idle");
  const [lastResult, setLastResult] = useState<WebBarcodeScanResult | null>(null);
  const [lastImageResult, setLastImageResult] = useState<NativeCoreActionResult | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);

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
      scanner.clear();
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

  const startScanner = useCallback(async () => {
    if (state === "starting" || state === "scanning") {
      return;
    }

    setState("starting");
    setErrorReason(null);
    completedRef.current = false;

    try {
      const permission = await nativeCoreRef.current.ensureActionPermissions("barcode.scan");
      if (!permission.ok) {
        setErrorReason(permission.reason ?? "camera-permission-denied");
        setState("failed");
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
  }, [handleSuccess, state, stopScanner]);

  async function handleScanFromImage() {
    setLastImageResult(null);
    setErrorReason(null);

    try {
      const result = await nativeCoreRef.current.scanBarcode({
        source: "image",
        timeoutMs: 18_000,
      });

      setLastImageResult(result);
      if (result.codes[0]?.rawValue) {
        setLastResult({
          rawValue: result.codes[0].rawValue,
          format: result.codes[0].format,
          scannedAt: new Date().toISOString(),
          contentType: "text",
        });
      } else {
        setErrorReason(result.reason ?? "barcode-not-found");
      }
    } catch (error) {
      setErrorReason(error instanceof Error ? error.message : String(error));
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
        scanner?.clear();
      } catch {
        // Ignore cleanup errors on route transitions.
      }
    };
  }, []);

  const displayError = getScannerErrorMessage(errorReason, messages);

  return (
    <div className="space-y-5">
      <SurfaceCard className="overflow-hidden">
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{messages.barcodeCameraTitle}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{messages.barcodeCameraDescription}</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-black">
            <div
              className="relative aspect-square w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
              id={scannerElementId}
            >
              {state !== "scanning" && state !== "starting" ? (
                <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm leading-6 text-white/72">
                  {messages.barcodeCameraIdle}
                </div>
              ) : null}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="size-56 rounded-[2rem] border border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.26)]" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={state === "starting" || state === "stopping"}
              onClick={state === "scanning" ? stopScanner : startScanner}
            >
              {state === "scanning"
                ? messages.barcodeStop
                : state === "starting"
                  ? messages.opening
                  : messages.barcodeStart}
            </Button>
            <Button
              disabled={state === "starting" || state === "scanning"}
              onClick={handleScanFromImage}
              variant="outline"
            >
              {messages.barcodeScanFromImage}
            </Button>
          </div>
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
          {lastImageResult?.ok === false && !displayError ? (
            <p className="rounded-xl bg-secondary px-3 py-2 text-xs leading-5 text-muted-foreground">
              {messages.barcodeNoResult}
            </p>
          ) : null}
        </div>
      </SurfaceCard>

      <Link className={buttonVariants({ variant: "ghost", className: "w-full" })} href="/device-services">
        {messages.backToDeviceServices}
      </Link>
    </div>
  );
}
