"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClientUpdateCheckInfo } from "@rtnn/shared-types";
import {
  createAppNativeCore,
  type NativeCoreClientInfo,
  type NativeCoreService,
} from "@/lib/native-core";
import type { AppMessages } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type NativeUpdateMessages = AppMessages["nativeUpdate"];

export function NativeUpdatePanel({
  messages,
}: {
  messages: NativeUpdateMessages;
}) {
  const nativeCore = useMemo<NativeCoreService>(() => createAppNativeCore(), []);
  const [clientInfo, setClientInfo] = useState<NativeCoreClientInfo | null>(null);
  const [checkResult, setCheckResult] = useState<ClientUpdateCheckInfo | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [opening, setOpening] = useState(false);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    let active = true;

    nativeCore
      .getRuntimeSnapshot()
      .then((snapshot) => {
        if (
          active &&
          snapshot.clientInfo.runtime === "tauri" &&
          snapshot.clientInfo.shell === "app-mobile"
        ) {
          setClientInfo(snapshot.clientInfo);
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
  }, [nativeCore]);

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
      setCheckResult(await nativeCore.checkAppUpdate());
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
      const result = await nativeCore.openUrl(checkResult.downloadUrl);
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
