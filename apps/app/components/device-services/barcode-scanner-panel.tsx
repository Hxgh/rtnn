"use client";

import type {
  Html5Qrcode,
  Html5QrcodeCameraScanConfig,
  Html5QrcodeResult,
} from "html5-qrcode";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import {
  clearScanner,
  createAppNativeCore,
  createHtml5QrcodeScanner,
  getScannerBoxSize,
  isNativeActionCancelled,
  normalizeBarcodeValue,
  normalizeWebBarcodeResult,
  runNativeActionWithWatchdog,
  scanBarcodeImageFile,
  scannerElementId,
  type NativeCoreService,
  type WebBarcodeScanResult,
} from "@/lib/native-core";
import type { AppMessages } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";

type ScannerMessages = AppMessages["nativeCapabilities"];
type ScannerState =
  | "idle"
  | "starting"
  | "scanning"
  | "stopping"
  | "failed";
type ImageScanState = "idle" | "scanning";

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
  const nativeCoreRef = useRef<NativeCoreService | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const completedRef = useRef(false);
  const manualStopRef = useRef(false);
  const scanRunIdRef = useRef(0);
  const [useNativeScanner, setUseNativeScanner] = useState(false);
  const [isTauriRuntime, setIsTauriRuntime] = useState(false);
  const [state, setState] = useState<ScannerState>("idle");
  const [imageScanState, setImageScanState] = useState<ImageScanState>("idle");
  const [lastResult, setLastResult] = useState<WebBarcodeScanResult | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);

  const getNativeCore = useCallback(() => {
    if (!nativeCoreRef.current) {
      nativeCoreRef.current = createAppNativeCore();
    }

    return nativeCoreRef.current;
  }, []);

  const stopScanner = useCallback(async (options?: { expected?: boolean }) => {
    if (options?.expected) {
      manualStopRef.current = true;
      completedRef.current = true;
      scanRunIdRef.current += 1;
      setErrorReason(null);
    }

    const scanner = scannerRef.current;

    if (!scanner) {
      setState((current) =>
        current === "stopping" || current === "starting" || current === "scanning"
          ? "idle"
          : current,
      );
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
      startTransition(() => {
        setLastResult(normalizeWebBarcodeResult(decodedText, result));
        setErrorReason(null);
      });
      await stopScanner();
    },
    [stopScanner],
  );

  const startScanner = useCallback(async () => {
    if (state === "starting" || state === "scanning") {
      return;
    }

    const scanRunId = scanRunIdRef.current + 1;
    scanRunIdRef.current = scanRunId;
    manualStopRef.current = false;
    setState("starting");
    setErrorReason(null);
    completedRef.current = false;

    try {
      await stopScanner();
      if (manualStopRef.current || scanRunId !== scanRunIdRef.current) {
        setState("idle");
        return;
      }
      const { scanner } = await createHtml5QrcodeScanner(scannerElementId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: getScannerBoxSize,
          aspectRatio: 1,
          disableFlip: false,
          videoConstraints: {
            facingMode: {
              ideal: "environment",
            },
          },
        } satisfies Html5QrcodeCameraScanConfig,
        (decodedText, result) => {
          void handleSuccess(decodedText, result);
        },
        undefined,
      );
      if (manualStopRef.current || scanRunId !== scanRunIdRef.current) {
        await stopScanner({ expected: true });
        return;
      }
      setState("scanning");
    } catch (error) {
      if (manualStopRef.current || scanRunId !== scanRunIdRef.current) {
        setErrorReason(null);
        setState("idle");
        await stopScanner({ expected: true });
        return;
      }

      setErrorReason(error instanceof Error ? error.message : String(error));
      setState("failed");
      await stopScanner();
    }
  }, [handleSuccess, state, stopScanner]);

  const startNativeScanner = useCallback(async () => {
    if (state === "starting" || state === "scanning") {
      return;
    }

    setState("scanning");
    setErrorReason(null);
    completedRef.current = false;

    try {
      const result = (await runNativeActionWithWatchdog(() =>
        getNativeCore().scanBarcode({
          source: "camera",
          timeoutMs: 30_000,
        }),
        30_000,
      )) as Awaited<ReturnType<NativeCoreService["scanBarcode"]>> & {
        dispatched?: boolean;
      };

      if (result.dispatched) {
        return;
      }

      if (result.ok && result.codes.length > 0) {
        const code = result.codes[0];
        completedRef.current = true;
        startTransition(() => {
          setLastResult(normalizeBarcodeValue(code.rawValue, code.format));
          setErrorReason(null);
        });
        return;
      }

      setErrorReason(
        isNativeActionCancelled(result) ? null : (result.reason ?? "barcode-not-found"),
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      setErrorReason(
        reason.toLowerCase().includes("cancel") ? null : reason,
      );
    } finally {
      setState("idle");
    }
  }, [getNativeCore, state]);

  const handleStartScanner = useCallback(() => {
    if (useNativeScanner) {
      void startNativeScanner();
      return;
    }

    if (isTauriRuntime) {
      setErrorReason("barcode-scanner-native-unavailable");
      return;
    }

    void startScanner();
  }, [isTauriRuntime, startNativeScanner, startScanner, useNativeScanner]);

  const handleStopScanner = useCallback(
    (event?: React.MouseEvent<HTMLButtonElement>) => {
      event?.preventDefault();
      event?.stopPropagation();
      void stopScanner({ expected: true });
    },
    [stopScanner],
  );

  async function handleScanFromImage() {
    if (imageScanState !== "idle") {
      return;
    }

    setErrorReason(null);

    if (useNativeScanner) {
      setImageScanState("scanning");

      try {
        const nativeResult = await getNativeCore().scanBarcode({
          source: "image",
          timeoutMs: 12_000,
        });

        if (nativeResult.ok && nativeResult.codes.length > 0) {
          const code = nativeResult.codes[0];
          startTransition(() => {
            setLastResult(normalizeBarcodeValue(code.rawValue, code.format));
            setErrorReason(null);
          });
        } else if (isNativeActionCancelled(nativeResult)) {
          setErrorReason(null);
        } else {
          setErrorReason(nativeResult.reason ?? "barcode-not-found");
        }
      } catch (error) {
        setErrorReason(error instanceof Error ? error.message : String(error));
      } finally {
        setImageScanState("idle");
      }

      return;
    }

    fileInputRef.current?.click();
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
      startTransition(() => {
        setLastResult(result);
        setErrorReason(null);
      });
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
    let active = true;

    getNativeCore()
      .getRuntimeSnapshot()
      .then((snapshot) => {
        if (active) {
          const tauriRuntime = snapshot.clientInfo.runtime === "tauri";
          setIsTauriRuntime(tauriRuntime);
          setUseNativeScanner(tauriRuntime && snapshot.capabilities.barcodeScan);
        }
      })
      .catch(() => {
        if (active) {
          setIsTauriRuntime(false);
          setUseNativeScanner(false);
        }
      });

    return () => {
      active = false;
    };
  }, [getNativeCore]);

  useEffect(() => {
    return () => {
      scanRunIdRef.current += 1;
      manualStopRef.current = true;
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
    state === "stopping";
  const isScanning = state === "scanning";
  const isNativeScannerBusy = useNativeScanner && isScanning;
  const isImageBusy = imageScanState !== "idle";

  async function copyResult() {
    if (!lastResult) {
      return;
    }

    await navigator.clipboard?.writeText(lastResult.rawValue).catch(() => {});
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
              disabled={isCameraBusy || isImageBusy || isNativeScannerBusy}
              onClick={isScanning ? handleStopScanner : handleStartScanner}
            >
              {isNativeScannerBusy
                ? messages.barcodeScanning
                : isScanning
                ? messages.barcodeStop
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
