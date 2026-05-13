"use client";

import { NATIVE_MAP_APPS } from "@rtnn/native-bridge";
import { useMemo, useRef, useState } from "react";
import { createAppNativeCore } from "./service";
import {
  nativeActionReturnSettleMs,
  runNativeActionWithWatchdog,
} from "./actions";
import type {
  NativeCoreService,
  NativeMapNavigationInput,
} from "./types";
import type { NativeMapOpenCandidate as NativeCoreMapCandidate } from "@rtnn/native-bridge";

export type MapNavigationActionState = "idle" | "checking" | "opening";
export type MapNavigationPickerState = "idle" | "checking" | "ready" | "empty" | "failed";

export type UseMapNavigationOptions = {
  nativeCore?: NativeCoreService;
  target?: NativeMapNavigationInput;
  detectionTimeoutMs?: number;
};

export type UseMapNavigationReturn = {
  candidates: NativeCoreMapCandidate[];
  pickerOpen: boolean;
  pickerState: MapNavigationPickerState;
  actionState: MapNavigationActionState;
  reason: string | null;
  detectMaps: () => Promise<void>;
  openMap: (
    candidate: NativeCoreMapCandidate,
    target?: NativeMapNavigationInput,
  ) => Promise<void>;
  openWebMap: (target?: NativeMapNavigationInput) => Promise<void>;
  closePicker: () => void;
};

const defaultMapDetectionTimeoutMs = 4_500;
const mapStatusOrder: Record<NativeCoreMapCandidate["status"], number> = {
  installed: 0,
  unknown: 1,
  "not-installed": 2,
  unsupported: 3,
};

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutReason: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(timeoutReason)), timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function createUnavailableMapCandidates(reason = "map-install-check-unavailable") {
  return NATIVE_MAP_APPS.map((item) => ({
    ...item,
    ok: true,
    installed: null,
    status: "unknown" as const,
    available: false,
    reason,
  }));
}

export function sortMapCandidates(candidates: NativeCoreMapCandidate[]) {
  return [...candidates].sort(
    (left, right) =>
      mapStatusOrder[left.status] - mapStatusOrder[right.status],
  );
}

export function isMapCandidateActionable(candidate: NativeCoreMapCandidate) {
  return candidate.status === "installed";
}

export function getVisibleMapCandidates(candidates: NativeCoreMapCandidate[]) {
  const sortedCandidates = sortMapCandidates(candidates);
  const installedCandidates = sortedCandidates.filter(isMapCandidateActionable);

  return installedCandidates.length > 0 ? sortedCandidates : [];
}

export function useMapNavigation(
  options: UseMapNavigationOptions = {},
): UseMapNavigationReturn {
  const fallbackNativeCore = useMemo<NativeCoreService>(() => createAppNativeCore(), []);
  const nativeCore = options.nativeCore ?? fallbackNativeCore;
  const candidatesCacheRef = useRef<NativeCoreMapCandidate[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [candidates, setCandidates] = useState<NativeCoreMapCandidate[]>([]);
  const [actionState, setActionState] = useState<MapNavigationActionState>("idle");
  const [pickerState, setPickerState] = useState<MapNavigationPickerState>("idle");
  const [reason, setReason] = useState<string | null>(null);

  async function detectMaps() {
    if (actionState !== "idle") {
      return;
    }

    setReason(null);
    setActionState("checking");
    setPickerState("checking");
    setPickerOpen(true);

    if (candidatesCacheRef.current) {
      setCandidates(candidatesCacheRef.current);
      setPickerState(
        candidatesCacheRef.current.some(isMapCandidateActionable)
          ? "ready"
          : "empty",
      );
      setActionState("idle");
      return;
    }

    setCandidates([]);

    try {
      const checkedCandidates = await withTimeout(
        nativeCore.getMapCandidates(),
        options.detectionTimeoutMs ?? defaultMapDetectionTimeoutMs,
        "map-install-check-timeout",
      );
      const sortedCandidates = sortMapCandidates(checkedCandidates);
      candidatesCacheRef.current = sortedCandidates;
      setCandidates(sortedCandidates);
      setPickerState(
        sortedCandidates.some(isMapCandidateActionable) ? "ready" : "empty",
      );
    } catch {
      setCandidates(createUnavailableMapCandidates());
      setPickerState("failed");
      setReason("map-install-check-unavailable");
    } finally {
      setActionState("idle");
    }
  }

  async function openMap(
    candidate: NativeCoreMapCandidate,
    target: NativeMapNavigationInput = {},
  ) {
    if (!isMapCandidateActionable(candidate)) {
      setReason(candidate.reason ?? "map-install-check-unavailable");
      return;
    }

    setPickerOpen(false);
    setActionState("opening");
    setReason(null);

    try {
      const result = await runNativeActionWithWatchdog(() =>
        nativeCore.openMapNavigation({
          ...options.target,
          ...target,
          appType: candidate.appType,
          allowWebFallback: true,
        }),
      );

      window.setTimeout(() => {
        setReason(result.ok ? null : (result.reason ?? "native-map-open-failed"));
      }, nativeActionReturnSettleMs);
    } catch (error) {
      setReason(error instanceof Error ? error.message : String(error));
    } finally {
      setActionState("idle");
    }
  }

  async function openWebMap(target: NativeMapNavigationInput = {}) {
    setPickerOpen(false);
    setActionState("opening");
    setReason(null);

    try {
      const result = await runNativeActionWithWatchdog(() =>
        nativeCore.openMapNavigation({
          ...options.target,
          ...target,
          allowWebFallback: true,
        }),
      );

      window.setTimeout(() => {
        setReason(result.ok ? null : (result.reason ?? "native-map-open-failed"));
      }, nativeActionReturnSettleMs);
    } catch (error) {
      setReason(error instanceof Error ? error.message : String(error));
    } finally {
      setActionState("idle");
    }
  }

  return {
    candidates,
    pickerOpen,
    pickerState,
    actionState,
    reason,
    detectMaps,
    openMap,
    openWebMap,
    closePicker: () => setPickerOpen(false),
  };
}
