"use client";

import type {
  Html5Qrcode,
  Html5QrcodeCameraScanConfig,
  Html5QrcodeResult,
} from "html5-qrcode";
import {
  startTransition,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  createHtml5QrcodeScanner,
  normalizeWebBarcodeResult,
  scanBarcodeImageFile,
  stopHtml5QrcodeScanner,
  type WebBarcodeScanResult,
} from "./scanner";

export type BarcodeScannerState =
  | "idle"
  | "starting"
  | "scanning"
  | "stopping"
  | "failed";
export type BarcodeImageScanState = "idle" | "scanning";

type StopBarcodeCameraScanOptions = {
  expected?: boolean;
  preserveResult?: boolean;
  clear?: boolean;
};

export type UseBarcodeScannerOptions = {
  scannerElementId?: string;
  imageScannerElementId?: string;
  onResult?: (result: WebBarcodeScanResult) => void;
};

export type UseBarcodeScannerReturn = {
  scannerElementId: string;
  imageScannerElementId: string;
  state: BarcodeScannerState;
  imageScanState: BarcodeImageScanState;
  lastResult: WebBarcodeScanResult | null;
  errorReason: string | null;
  isCameraBusy: boolean;
  isScanning: boolean;
  isImageBusy: boolean;
  startCameraScan: () => Promise<void>;
  stopCameraScan: (options?: StopBarcodeCameraScanOptions) => Promise<void>;
  scanImageFile: (file: File | null) => Promise<WebBarcodeScanResult | null>;
  resetResult: () => void;
};

function createStableElementId(prefix: string, reactId: string) {
  const stableId = reactId.replace(/[^a-zA-Z0-9_-]/g, "");

  return `${prefix}-${stableId || "reader"}`;
}

function normalizeBarcodeScanError(error: unknown) {
  const reason = error instanceof Error ? error.message : String(error);

  return reason.includes("No barcode or QR code detected")
    ? "barcode-not-found"
    : reason;
}

function clearScannerHost(elementId: string) {
  document.getElementById(elementId)?.replaceChildren();
}

function waitForScannerHost(elementId: string, timeoutMs = 1_200) {
  return new Promise<HTMLElement>((resolve, reject) => {
    const startedAt = performance.now();

    function check() {
      const element = document.getElementById(elementId);

      if (element) {
        resolve(element);
        return;
      }

      if (performance.now() - startedAt > timeoutMs) {
        reject(new Error("barcode-scanner-host-not-mounted"));
        return;
      }

      window.requestAnimationFrame(check);
    }

    check();
  });
}

export function useBarcodeScanner(
  options: UseBarcodeScannerOptions = {},
): UseBarcodeScannerReturn {
  const reactId = useId();
  const scannerElementId =
    options.scannerElementId ?? createStableElementId("rtnn-barcode-reader", reactId);
  const imageScannerElementId =
    options.imageScannerElementId ?? `${scannerElementId}-image`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const completedRef = useRef(false);
  const manualStopRef = useRef(false);
  const scanRunIdRef = useRef(0);
  const onResultRef = useRef(options.onResult);
  const [stateValue, setStateValue] = useState<BarcodeScannerState>("idle");
  const [imageScanStateValue, setImageScanStateValue] =
    useState<BarcodeImageScanState>("idle");
  const stateRef = useRef<BarcodeScannerState>("idle");
  const imageScanStateRef = useRef<BarcodeImageScanState>("idle");
  const [lastResult, setLastResult] = useState<WebBarcodeScanResult | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);

  useEffect(() => {
    onResultRef.current = options.onResult;
  }, [options.onResult]);

  const setState = useCallback(
    (
      next:
        | BarcodeScannerState
        | ((current: BarcodeScannerState) => BarcodeScannerState),
    ) => {
      const resolved = typeof next === "function" ? next(stateRef.current) : next;
      stateRef.current = resolved;
      setStateValue(resolved);
    },
    [],
  );

  const setImageScanState = useCallback(
    (
      next:
        | BarcodeImageScanState
        | ((current: BarcodeImageScanState) => BarcodeImageScanState),
    ) => {
      const resolved =
        typeof next === "function" ? next(imageScanStateRef.current) : next;
      imageScanStateRef.current = resolved;
      setImageScanStateValue(resolved);
    },
    [],
  );

  const commitResult = useCallback((result: WebBarcodeScanResult) => {
    startTransition(() => {
      setLastResult(result);
      setErrorReason(null);
    });
    onResultRef.current?.(result);
  }, []);

  const stopCameraScan = useCallback(
    async (stopOptions?: StopBarcodeCameraScanOptions) => {
      if (stopOptions?.expected) {
        manualStopRef.current = true;
        if (!stopOptions.preserveResult) {
          completedRef.current = true;
        }
        scanRunIdRef.current += 1;
        setErrorReason(null);
      }

      const scanner = scannerRef.current;

      if (!scanner) {
        setState((current) =>
          current === "stopping" ||
          current === "starting" ||
          current === "scanning"
            ? "idle"
            : current,
        );
        return;
      }

      setState("stopping");

      try {
        await stopHtml5QrcodeScanner(scanner, { clear: stopOptions?.clear });
      } catch {
        // stop/clear can throw after permission changes or route transitions.
      } finally {
        scannerRef.current = null;
        setState("idle");
      }
    },
    [setState],
  );

  const handleSuccess = useCallback(
    async (decodedText: string, result: Html5QrcodeResult) => {
      if (completedRef.current) {
        return;
      }

      completedRef.current = true;
      commitResult(normalizeWebBarcodeResult(decodedText, result));
      await stopCameraScan({ expected: true, preserveResult: true });
    },
    [commitResult, stopCameraScan],
  );

  const startCameraScan = useCallback(async () => {
    if (stateRef.current === "starting" || stateRef.current === "scanning") {
      return;
    }

    await stopCameraScan({ clear: true });
    clearScannerHost(scannerElementId);

    const scanRunId = scanRunIdRef.current + 1;
    scanRunIdRef.current = scanRunId;
    manualStopRef.current = false;
    setState("starting");
    setErrorReason(null);
    completedRef.current = false;

    try {
      if (manualStopRef.current || scanRunId !== scanRunIdRef.current) {
        setState("idle");
        return;
      }

      await waitForScannerHost(scannerElementId);

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
        await stopCameraScan({ expected: true, clear: true });
        return;
      }

      setState("scanning");
    } catch (error) {
      if (manualStopRef.current || scanRunId !== scanRunIdRef.current) {
        setErrorReason(null);
        setState("idle");
        await stopCameraScan({ expected: true, clear: true });
        return;
      }

      setErrorReason(normalizeBarcodeScanError(error));
      setState("failed");
      await stopCameraScan({ expected: true, clear: true });
    }
  }, [handleSuccess, scannerElementId, setState, stopCameraScan]);

  const scanImageFile = useCallback(
    async (file: File | null) => {
      if (imageScanStateRef.current !== "idle") {
        return null;
      }

      if (!file) {
        setImageScanState("idle");
        return null;
      }

      if (!file.type.startsWith("image/")) {
        setErrorReason("barcode-image-unsupported");
        setImageScanState("idle");
        return null;
      }

      setErrorReason(null);
      setImageScanState("scanning");

      try {
        const result = await scanBarcodeImageFile(file, imageScannerElementId);

        commitResult(result);
        return result;
      } catch (error) {
        setErrorReason(normalizeBarcodeScanError(error));
        return null;
      } finally {
        setImageScanState("idle");
      }
    },
    [commitResult, imageScannerElementId, setImageScanState],
  );

  const resetResult = useCallback(() => {
    setLastResult(null);
    setErrorReason(null);
  }, []);

  useEffect(() => {
    return () => {
      scanRunIdRef.current += 1;
      manualStopRef.current = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner) {
        void stopHtml5QrcodeScanner(scanner);
      }
    };
  }, []);

  return {
    scannerElementId,
    imageScannerElementId,
    state: stateValue,
    imageScanState: imageScanStateValue,
    lastResult,
    errorReason,
    isCameraBusy: stateValue === "starting" || stateValue === "stopping",
    isScanning: stateValue === "scanning",
    isImageBusy: imageScanStateValue !== "idle",
    startCameraScan,
    stopCameraScan,
    scanImageFile,
    resetResult,
  };
}
