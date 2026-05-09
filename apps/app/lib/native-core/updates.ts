"use client";

import {
  resolveNativeClientUpdateQuery,
  type NativeBridge,
  type NativeClientUpdateQuery,
} from "@rtnn/native-bridge";
import type { ClientUpdateCheckInfo } from "@rtnn/shared-types";

export async function buildUpdateCheckQuery(
  nativeBridge: NativeBridge,
): Promise<NativeClientUpdateQuery | null> {
  const info = await nativeBridge.getClientInfo();
  return resolveNativeClientUpdateQuery(info);
}

export async function checkAppUpdate(
  nativeBridge: NativeBridge,
  options: { currentVersion?: string } = {},
): Promise<ClientUpdateCheckInfo | null> {
  const query = await buildUpdateCheckQuery(nativeBridge);

  if (!query) {
    return null;
  }

  const params = new URLSearchParams({
    client: query.client,
    target: query.target,
    channel: query.channel,
  });

  const currentVersion = options.currentVersion ?? query.currentVersion;

  if (currentVersion) {
    params.set("currentVersion", currentVersion);
  }

  const response = await fetch(`/api/client-updates/check?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("client-update-check-failed");
  }

  return (await response.json()) as ClientUpdateCheckInfo;
}
