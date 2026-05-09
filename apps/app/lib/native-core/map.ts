"use client";

import {
  NATIVE_MAP_APPS,
  type NativeBridge,
  type NativeBridgeActionResult,
  type NativeMapInstallResult,
  type NativeMapOpenCandidate,
} from "@rtnn/native-bridge";
import type { NativeMapNavigationInput } from "./types";

function isMapCandidateAvailable(result: NativeMapInstallResult) {
  return result.status === "installed" || result.status === "unknown";
}

function normalizeNativeError(error: unknown) {
  return error instanceof Error
    ? error.message || "native-action-failed"
    : String(error || "native-action-failed");
}

export async function getMapCandidates(
  nativeBridge: NativeBridge,
): Promise<NativeMapOpenCandidate[]> {
  return Promise.all(
    NATIVE_MAP_APPS.map(async (app) => {
      try {
        const status = await nativeBridge.checkMapInstalled({
          appType: app.appType,
        });

        return {
          ...app,
          ...status,
          available: isMapCandidateAvailable(status),
        };
      } catch (error) {
        return {
          ...app,
          ok: true,
          installed: null,
          status: "unknown" as const,
          available: true,
          reason: normalizeNativeError(error),
        };
      }
    }),
  );
}

export async function openMapNavigation(
  nativeBridge: NativeBridge,
  input: NativeMapNavigationInput,
): Promise<NativeBridgeActionResult & { appType?: NativeMapNavigationInput["appType"] }> {
  const candidates = input.appType
    ? NATIVE_MAP_APPS.filter((item) => item.appType === input.appType)
    : NATIVE_MAP_APPS;
  let lastReason = "";

  for (const candidate of candidates) {
    const status = await nativeBridge.checkMapInstalled({
      appType: candidate.appType,
    });

    if (status.status === "not-installed" || status.status === "unsupported") {
      lastReason = status.reason ?? status.status;
      continue;
    }

    const result = await nativeBridge.openMapNavigation({
      ...input,
      appType: candidate.appType,
      allowWebFallback: !input.appType,
    });

    if (result.ok) {
      return {
        ...result,
        appType: candidate.appType,
      };
    }

    lastReason = result.reason ?? status.reason ?? "map-open-failed";
  }

  return {
    ok: false,
    reason: lastReason || "no-map-candidate",
  };
}
