"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { NativePickedFile as NativeCorePickedFile } from "@rtnn/native-bridge";
import { createAppNativeCore } from "./service";
import { isNativeActionCancelled } from "./actions";
import type {
  NativeCoreService,
  NativeMediaSource,
} from "./types";

export type MediaPickerState = "idle" | "opening";

export type UseMediaPickerOptions = {
  nativeCore?: NativeCoreService;
  timeoutMs?: number;
};

export type UseMediaPickerReturn = {
  state: MediaPickerState;
  files: NativeCorePickedFile[];
  reason: string | null;
  isOpening: boolean;
  pickMedia: (source: NativeMediaSource) => Promise<void>;
  clearFiles: () => void;
};

export function useMediaPicker(
  options: UseMediaPickerOptions = {},
): UseMediaPickerReturn {
  const fallbackNativeCore = useMemo<NativeCoreService>(() => createAppNativeCore(), []);
  const nativeCore = options.nativeCore ?? fallbackNativeCore;
  const runIdRef = useRef(0);
  const stateRef = useRef<MediaPickerState>("idle");
  const [state, setState] = useState<MediaPickerState>("idle");
  const [files, setFiles] = useState<NativeCorePickedFile[]>([]);
  const [reason, setReason] = useState<string | null>(null);

  const setPickerState = useCallback((next: MediaPickerState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  async function pickMedia(source: NativeMediaSource) {
    if (stateRef.current !== "idle") {
      return;
    }

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    setPickerState("opening");
    setReason(null);
    let completed = false;
    let leftPage = false;
    let settleTimer: number | null = null;

    function cleanup() {
      if (settleTimer) {
        window.clearTimeout(settleTimer);
      }

      window.removeEventListener("blur", handleLeave);
      window.removeEventListener("focus", handleReturn);
      window.removeEventListener("pagehide", handleLeave);
      window.removeEventListener("pageshow", handleReturn);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }

    function finishOpening() {
      if (completed || runIdRef.current !== runId) {
        return;
      }

      setPickerState("idle");
    }

    function scheduleReturnSettle() {
      if (!leftPage || completed || runIdRef.current !== runId) {
        return;
      }

      if (settleTimer) {
        window.clearTimeout(settleTimer);
      }

      settleTimer = window.setTimeout(finishOpening, 350);
    }

    function handleLeave() {
      leftPage = true;
    }

    function handleReturn() {
      scheduleReturnSettle();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        handleLeave();
        return;
      }

      if (document.visibilityState === "visible") {
        handleReturn();
      }
    }

    window.addEventListener("blur", handleLeave);
    window.addEventListener("focus", handleReturn);
    window.addEventListener("pagehide", handleLeave);
    window.addEventListener("pageshow", handleReturn);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    try {
      const result = await nativeCore.pickMedia(source, {
        timeoutMs: options.timeoutMs ?? 3_000,
      });

      if (runIdRef.current !== runId) {
        return;
      }

      if (result.ok) {
        setFiles(result.files);
        return;
      }

      setReason(
        isNativeActionCancelled(result)
          ? null
          : (result.reason ?? "media-action-failed"),
      );
    } catch (error) {
      if (runIdRef.current === runId) {
        setReason(error instanceof Error ? error.message : String(error));
      }
    } finally {
      completed = true;
      cleanup();
      if (runIdRef.current === runId) {
        setPickerState("idle");
      }
    }
  }

  return {
    state,
    files,
    reason,
    isOpening: state === "opening",
    pickMedia,
    clearFiles: () => setFiles([]),
  };
}
