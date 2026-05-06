"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createNativeBridge,
  hasNativeFeature,
  resolveNativeClientUpdateQuery,
  type NativeClientInfo,
} from "@rtnn/native-bridge";
import type { ClientUpdateCheckInfo } from "@rtnn/shared-types";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";

type NativeUpdatePanelDictionary = {
  nativeShellTitle: string;
  nativeShellDescription: string;
  nativeRuntime: string;
  nativeVersion: string;
  nativeChannel: string;
  checkUpdate: string;
  checkingUpdate: string;
  installUpdate: string;
  installingUpdate: string;
  openUpdate: string;
  openingUpdate: string;
  updateAvailable: string;
  noUpdate: string;
  updateUnavailable: string;
  updateInstalled: string;
  updateOpened: string;
};

type CompletionState = "installed" | "opened" | null;

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
  dictionary,
}: {
  dictionary: NativeUpdatePanelDictionary;
}) {
  const bridge = useMemo(() => createNativeBridge(), []);
  const [clientInfo, setClientInfo] = useState<NativeClientInfo | null>(null);
  const [checkResult, setCheckResult] = useState<ClientUpdateCheckInfo | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [completed, setCompleted] = useState<CompletionState>(null);

  useEffect(() => {
    let active = true;

    bridge
      .getClientInfo()
      .then((info) => {
        if (active && info.runtime === "tauri" && info.shell === "admin-desktop") {
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

  if (!clientInfo || clientInfo.shell !== "admin-desktop") {
    return null;
  }

  const canUseNativeUpdater = hasNativeFeature(clientInfo, "updater");
  const updateAvailable = Boolean(checkResult?.updateAvailable);
  const canOpenInstaller = Boolean(checkResult?.downloadUrl);
  const canRunUpdateAction = updateAvailable && (canUseNativeUpdater || canOpenInstaller);
  const statusText = checkFailed
    ? dictionary.updateUnavailable
    : checkResult
    ? updateAvailable
      ? dictionary.updateAvailable
      : dictionary.noUpdate
    : null;
  const actionLabel = canUseNativeUpdater
    ? installing
      ? dictionary.installingUpdate
      : dictionary.installUpdate
    : installing
      ? dictionary.openingUpdate
      : dictionary.openUpdate;
  const completedMessage =
    completed === "installed"
      ? dictionary.updateInstalled
      : completed === "opened"
        ? dictionary.updateOpened
        : null;

  async function handleCheckUpdate() {
    if (!clientInfo) {
      return;
    }

    setChecking(true);
    setCompleted(null);
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

  async function handleInstallUpdate() {
    setInstalling(true);
    setCompleted(null);

    try {
      if (canUseNativeUpdater) {
        const result = await bridge.installUpdate();
        if (result.ok) {
          setCompleted("installed");
          return;
        }
      }

      if (checkResult?.downloadUrl) {
        const result = await bridge.openExternal({ url: checkResult.downloadUrl });
        setCompleted(result.ok ? "opened" : null);
      }
    } finally {
      setInstalling(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/15 p-5 md:flex-row md:items-start md:justify-between">
      <div className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            {dictionary.nativeShellTitle}
          </h2>
          <p className="text-sm text-muted-foreground">
            {dictionary.nativeShellDescription}
          </p>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">{dictionary.nativeRuntime}</dt>
            <dd>{clientInfo.platform}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{dictionary.nativeVersion}</dt>
            <dd>{clientInfo.appVersion ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{dictionary.nativeChannel}</dt>
            <dd>{clientInfo.channel}</dd>
          </div>
        </dl>
        {statusText ? (
          <Badge variant={updateAvailable ? "default" : "outline"}>{statusText}</Badge>
        ) : null}
        {updateAvailable && checkResult?.version ? (
          <p className="text-xs text-muted-foreground">
            {clientInfo.appVersion ?? "-"} -&gt; {checkResult.shellVersion ?? checkResult.version}
          </p>
        ) : null}
        {completedMessage ? (
          <p className="text-sm text-muted-foreground">{completedMessage}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col gap-2 md:w-40">
        <Button onClick={handleCheckUpdate} disabled={checking || installing} variant="outline">
          {checking ? dictionary.checkingUpdate : dictionary.checkUpdate}
        </Button>
        {canRunUpdateAction ? (
          <Button onClick={handleInstallUpdate} disabled={checking || installing}>
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
