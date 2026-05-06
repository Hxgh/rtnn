"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createNativeBridge,
  resolveNativeClientUpdateQuery,
  type NativeClientInfo,
} from "@rtnn/native-bridge";
import type { ClientUpdateCheckInfo } from "@rtnn/shared-types";
import type { AppMessages } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type NativeUpdateMessages = AppMessages["nativeUpdate"];

function buildUpdateCheckUrl(info: NativeClientInfo) {
  const query = resolveNativeClientUpdateQuery(info);

  if (!query) {
    return null;
  }

  const params = new URLSearchParams({
    client: query.client,
    target: query.target,
    channel: query.channel,
  });

  if (query.currentVersion) {
    params.set("currentVersion", query.currentVersion);
  }

  return `/api/client-updates/check?${params.toString()}`;
}

async function checkClientUpdate(info: NativeClientInfo) {
  const url = buildUpdateCheckUrl(info);

  if (!url) {
    return null;
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("client-update-check-failed");
  }

  return (await response.json()) as ClientUpdateCheckInfo;
}

export function NativeUpdatePanel({
  messages,
}: {
  messages: NativeUpdateMessages;
}) {
  const bridge = useMemo(() => createNativeBridge(), []);
  const [clientInfo, setClientInfo] = useState<NativeClientInfo | null>(null);
  const [checkResult, setCheckResult] = useState<ClientUpdateCheckInfo | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [opening, setOpening] = useState(false);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    let active = true;

    bridge
      .getClientInfo()
      .then((info) => {
        if (active && info.runtime === "tauri" && info.shell === "app-mobile") {
          setClientInfo(info);
        }
      })
      .catch(() => {
        if (active) {
          setClientInfo(null);
        }
      });

    return () => {
      active = false;
    };
  }, [bridge]);

  if (!clientInfo || clientInfo.shell !== "app-mobile") {
    return null;
  }

  const updateAvailable = Boolean(checkResult?.updateAvailable);
  const canOpenUpdate = updateAvailable && Boolean(checkResult?.downloadUrl);
  const statusText = checkFailed
    ? messages.updateUnavailable
    : checkResult
      ? updateAvailable
        ? messages.updateAvailable
        : messages.noUpdate
      : null;

  async function handleCheckUpdate() {
    if (!clientInfo) {
      return;
    }

    setChecking(true);
    setOpened(false);
    setCheckFailed(false);

    try {
      setCheckResult(await checkClientUpdate(clientInfo));
    } catch {
      setCheckResult(null);
      setCheckFailed(true);
    } finally {
      setChecking(false);
    }
  }

  async function handleOpenUpdate() {
    if (!checkResult?.downloadUrl) {
      return;
    }

    setOpening(true);
    setOpened(false);

    try {
      const result = await bridge.openExternal({ url: checkResult.downloadUrl });
      setOpened(result.ok);
    } finally {
      setOpening(false);
    }
  }

  return (
    <SurfaceCard className="overflow-hidden">
      <div className="space-y-4 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{messages.title}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{messages.description}</p>
          </div>
          {statusText ? (
            <span
              className={cn(
                "shrink-0 rounded-md border px-2 py-1 text-xs",
                updateAvailable
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-border text-muted-foreground",
              )}
            >
              {statusText}
            </span>
          ) : null}
        </div>

        <dl className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{messages.platform}</dt>
            <dd>{clientInfo.platform}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{messages.version}</dt>
            <dd>{clientInfo.appVersion ?? "-"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{messages.channel}</dt>
            <dd>{clientInfo.channel}</dd>
          </div>
        </dl>

        {updateAvailable && checkResult?.version ? (
          <p className="text-xs text-muted-foreground">
            {clientInfo.appVersion ?? "-"} -&gt; {checkResult.shellVersion ?? checkResult.version}
          </p>
        ) : null}
        {opened ? (
          <p className="text-xs leading-5 text-muted-foreground">{messages.updateOpened}</p>
        ) : null}

        <div className="grid gap-2">
          <Button onClick={handleCheckUpdate} disabled={checking || opening} variant="outline">
            {checking ? messages.checkingUpdate : messages.checkUpdate}
          </Button>
          {canOpenUpdate ? (
            <Button onClick={handleOpenUpdate} disabled={checking || opening}>
              {opening ? messages.openingUpdate : messages.openUpdate}
            </Button>
          ) : null}
        </div>
      </div>
    </SurfaceCard>
  );
}
