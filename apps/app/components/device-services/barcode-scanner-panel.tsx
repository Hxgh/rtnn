"use client";

import { useBarcodeScanner, type WebBarcodeScanResult } from "@/lib/native-core";
import type { AppMessages } from "@/lib/i18n";
import { BarcodeScannerControl } from "@/components/native-core";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";

type ScannerMessages = AppMessages["nativeCapabilities"];

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

  if (
    reason === "barcode-scan-cancelled" ||
    reason === "file-picker-cancelled" ||
    reason === "cancelled" ||
    reason === "canceled" ||
    reason.toLowerCase().includes("cancel")
  ) {
    return null;
  }

  if (
    reason === "barcode-scanner-native-unavailable" ||
    reason === "barcode-scan-native-unavailable"
  ) {
    return messages.barcodeNativeUnavailable;
  }

  if (reason === "barcode-detector-unavailable" || reason === "barcode-image-unsupported") {
    return messages.barcodeImageUnsupported;
  }

  return messages.failed;
}

export function BarcodeScannerPanel({
  messages,
}: {
  messages: ScannerMessages;
}) {
  const scanner = useBarcodeScanner();
  const displayError = getScannerErrorMessage(scanner.errorReason, messages);

  async function copyResult() {
    if (!scanner.lastResult) {
      return;
    }

    await navigator.clipboard?.writeText(scanner.lastResult.rawValue).catch(() => {});
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
          <BarcodeScannerControl
            errorMessage={displayError}
            labels={{
              chooseImage: messages.barcodeScanFromImage,
              idle: messages.barcodeCameraIdle,
              imageScanning: messages.barcodeImageScanning,
              opening: messages.opening,
              start: messages.barcodeStart,
              stop: messages.barcodeStop,
              title: messages.barcodeCameraTitle,
            }}
            scanner={scanner}
          />
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="space-y-3 px-4 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            {messages.barcodeResult}
          </h2>
          {scanner.lastResult ? (
            <dl className="grid gap-2 text-sm">
              <div className="grid grid-cols-[5rem_1fr] gap-3">
                <dt className="text-muted-foreground">{messages.barcodeContentType}</dt>
                <dd className="text-foreground">
                  {getResultTypeLabel(scanner.lastResult.contentType, messages)}
                </dd>
              </div>
              <div className="grid grid-cols-[5rem_1fr] gap-3">
                <dt className="text-muted-foreground">{messages.barcodeFormat}</dt>
                <dd className="text-foreground">{scanner.lastResult.format ?? "-"}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-muted-foreground">{messages.barcodeContent}</dt>
                <dd className="break-words rounded-xl bg-secondary px-3 py-2 text-foreground">
                  {scanner.lastResult.rawValue}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              {messages.barcodeNoResult}
            </p>
          )}
          {displayError ? (
            <p className="rounded-xl bg-secondary px-3 py-2 text-xs leading-5 text-muted-foreground">
              {displayError}
            </p>
          ) : null}
          {scanner.lastResult ? (
            <div>
              <Button className="w-full" onClick={copyResult} type="button" variant="outline">
                {messages.barcodeCopyResult}
              </Button>
            </div>
          ) : null}
        </div>
      </SurfaceCard>
    </div>
  );
}
