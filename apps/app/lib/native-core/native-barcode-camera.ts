"use client";

import type { NativeBarcodeScanResult } from "@rtnn/native-bridge";

export const nativeBarcodeCameraResultEvent =
  "rtnn:android-barcode-scan-result";

type NativeBarcodeCameraRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type AndroidBarcodeCameraBridge = {
  startCameraScan?: (optionsJson?: string) => string | NativeBarcodeScanResult | boolean;
  updateCameraScanRect?: (optionsJson?: string) => string | NativeBarcodeScanResult | boolean;
  stopCameraScan?: () => string | NativeBarcodeScanResult | boolean;
};

type NativeBarcodeCameraWindow = Window & {
  AndroidBarcode?: AndroidBarcodeCameraBridge;
};

export type NativeBarcodeCameraSessionOptions = {
  element: HTMLElement;
  formats?: string[];
  timeoutMs?: number;
  successFeedback?: boolean;
};

export type NativeBarcodeCameraSession = {
  stop: () => void;
  updateRect: () => void;
};

export type NativeBarcodeCameraSessionResult =
  | {
      ok: true;
      session: NativeBarcodeCameraSession;
    }
  | {
      ok: false;
      reason: string;
    };

export type NativeBarcodeCameraResultHandler = (
  result: NativeBarcodeScanResult,
) => void;

function getAndroidBarcodeBridge() {
  if (typeof window === "undefined") {
    return null;
  }

  return (window as NativeBarcodeCameraWindow).AndroidBarcode ?? null;
}

function normalizeBridgeResult(
  value: string | NativeBarcodeScanResult | boolean | undefined,
): NativeBarcodeScanResult {
  if (typeof value === "boolean") {
    return {
      ok: value,
      reason: value ? undefined : "barcode-scan-failed",
      codes: [],
    };
  }

  if (typeof value === "string") {
    try {
      return normalizeBridgeResult(JSON.parse(value) as NativeBarcodeScanResult);
    } catch {
      return {
        ok: false,
        reason: value || "barcode-scan-invalid-result",
        codes: [],
      };
    }
  }

  if (!value || typeof value !== "object") {
    return {
      ok: false,
      reason: "barcode-scan-invalid-result",
      codes: [],
    };
  }

  const codes = Array.isArray(value.codes)
    ? value.codes.filter((code) => code && typeof code.rawValue === "string")
    : [];

  return {
    ...value,
    ok: Boolean(value.ok || codes.length > 0),
    reason: codes.length > 0 ? undefined : value.reason,
    codes,
    feedbackPlayed: value.feedbackPlayed === true,
  };
}

function getNativeRect(element: HTMLElement): NativeBarcodeCameraRect | null {
  const rect = element.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  const width = Math.round(rect.width * scale);
  const height = Math.round(rect.height * scale);

  if (width <= 0 || height <= 0) {
    return null;
  }

  return {
    x: Math.round(rect.left * scale),
    y: Math.round(rect.top * scale),
    width,
    height,
  };
}

function buildCameraScanOptions(
  options: NativeBarcodeCameraSessionOptions,
): Record<string, unknown> | null {
  const rect = getNativeRect(options.element);

  if (!rect) {
    return null;
  }

  return {
    source: "camera",
    formats: options.formats,
    timeoutMs: options.timeoutMs,
    successFeedback: options.successFeedback,
    rect,
  };
}

export function startNativeBarcodeCameraSession(
  options: NativeBarcodeCameraSessionOptions,
): NativeBarcodeCameraSessionResult {
  const bridge = getAndroidBarcodeBridge();

  if (typeof bridge?.startCameraScan !== "function") {
    return {
      ok: false,
      reason: "native-barcode-camera-unavailable",
    };
  }

  const payload = buildCameraScanOptions(options);

  if (!payload) {
    return {
      ok: false,
      reason: "native-barcode-camera-host-not-visible",
    };
  }

  const result = normalizeBridgeResult(
    bridge.startCameraScan(JSON.stringify(payload)),
  );

  if (!result.ok && !result.dispatched) {
    return {
      ok: false,
      reason: result.reason ?? "native-barcode-camera-start-failed",
    };
  }

  const updateRect = () => {
    const nextPayload = buildCameraScanOptions(options);

    if (!nextPayload || typeof bridge.updateCameraScanRect !== "function") {
      return;
    }

    bridge.updateCameraScanRect(JSON.stringify(nextPayload));
  };
  const handleViewportChange = () => {
    window.requestAnimationFrame(updateRect);
  };

  window.addEventListener("resize", handleViewportChange);
  window.visualViewport?.addEventListener("resize", handleViewportChange);
  window.visualViewport?.addEventListener("scroll", handleViewportChange);

  return {
    ok: true,
    session: {
      updateRect,
      stop() {
        window.removeEventListener("resize", handleViewportChange);
        window.visualViewport?.removeEventListener("resize", handleViewportChange);
        window.visualViewport?.removeEventListener("scroll", handleViewportChange);
        bridge.stopCameraScan?.();
      },
    },
  };
}

export function subscribeNativeBarcodeCameraResult(
  handler: NativeBarcodeCameraResultHandler,
) {
  const listener = (event: Event) => {
    handler(
      normalizeBridgeResult(
        (event as CustomEvent<NativeBarcodeScanResult>).detail,
      ),
    );
  };

  window.addEventListener(nativeBarcodeCameraResultEvent, listener);

  return () => {
    window.removeEventListener(nativeBarcodeCameraResultEvent, listener);
  };
}
