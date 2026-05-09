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

type OpenTarget = "installer" | "download-page" | null;

function resolveDownloadsUrl() {
  return new URL("/download", window.location.href).toString();
}

function formatFileSize(value?: number | null) {
  if (!value || value <= 0) {
    return "-";
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

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
  const [openFailed, setOpenFailed] = useState(false);

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
  const canOpenInstaller = Boolean(checkResult?.downloadUrl);
  const openTarget: OpenTarget = canOpenInstaller
    ? "installer"
    : checkResult
      ? "download-page"
      : null;
  const statusText = checkFailed
    ? messages.updateUnavailable
    : checkResult
      ? updateAvailable
        ? messages.updateAvailable
        : canOpenInstaller
          ? messages.latestInstallerAvailable
          : messages.noUpdate
      : null;
  const actionLabel = canOpenInstaller
    ? updateAvailable
      ? messages.openUpdate
      : messages.openInstaller
    : messages.openDownloads;

  async function handleCheckUpdate() {
    if (!clientInfo) {
      return;
    }

    setChecking(true);
    setOpened(false);
    setOpenFailed(false);
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

  async function handleOpenUpdate(target: OpenTarget) {
    const url =
      target === "installer"
        ? checkResult?.downloadUrl
        : target === "download-page"
          ? resolveDownloadsUrl()
          : null;

    if (!url) {
      return;
    }

    setOpening(true);
    setOpened(false);
    setOpenFailed(false);

    try {
      const result = await nativeCore.openUrl(url);
      setOpened(result.ok);
      setOpenFailed(!result.ok);
    } catch {
      setOpenFailed(true);
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
        {checkResult?.downloadUrl ? (
          <dl className="grid gap-2 rounded-xl border border-border/70 px-3 py-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{messages.packageFile}</dt>
              <dd className="truncate text-right">{checkResult.fileName ?? "-"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{messages.packageSize}</dt>
              <dd>{formatFileSize(checkResult.fileSize)}</dd>
            </div>
          </dl>
        ) : checkResult?.reason ? (
          <p className="text-xs leading-5 text-muted-foreground">
            {messages.downloadUnavailable}: {checkResult.reason}
          </p>
        ) : null}
        {opened ? (
          <p className="text-xs leading-5 text-muted-foreground">{messages.updateOpened}</p>
        ) : null}
        {openFailed ? (
          <p className="text-xs leading-5 text-destructive">{messages.openFailed}</p>
        ) : null}

        <div className="grid gap-2">
          <Button onClick={handleCheckUpdate} disabled={checking || opening} variant="outline">
            {checking ? messages.checkingUpdate : messages.checkUpdate}
          </Button>
          {openTarget ? (
            <Button
              onClick={() => handleOpenUpdate(openTarget)}
              disabled={checking || opening}
            >
              {opening ? messages.openingUpdate : actionLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </SurfaceCard>
  );
}
