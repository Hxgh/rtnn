"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createNativeBridge,
  hasNativeFeature,
  type NativeClientInfo,
  type NativeUpdateCheckResult,
} from "@rtnn/native-bridge";
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
  updateAvailable: string;
  noUpdate: string;
  updateUnavailable: string;
  updateInstalled: string;
};

export function NativeUpdatePanel({
  dictionary,
}: {
  dictionary: NativeUpdatePanelDictionary;
}) {
  const bridge = useMemo(() => createNativeBridge(), []);
  const [clientInfo, setClientInfo] = useState<NativeClientInfo | null>(null);
  const [checkResult, setCheckResult] = useState<NativeUpdateCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

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

  if (!clientInfo || !hasNativeFeature(clientInfo, "updater")) {
    return null;
  }

  const updateAvailable = Boolean(checkResult?.update?.available);
  const statusText = checkResult
    ? updateAvailable
      ? dictionary.updateAvailable
      : checkResult.ok
        ? dictionary.noUpdate
        : dictionary.updateUnavailable
    : null;

  async function handleCheckUpdate() {
    setChecking(true);
    setInstalled(false);

    try {
      setCheckResult(await bridge.checkUpdate());
    } finally {
      setChecking(false);
    }
  }

  async function handleInstallUpdate() {
    setInstalling(true);

    try {
      const result = await bridge.installUpdate();
      setInstalled(result.ok);
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
        {checkResult?.update?.version ? (
          <p className="text-xs text-muted-foreground">
            {checkResult.update.currentVersion ?? "-"} -&gt; {checkResult.update.version}
          </p>
        ) : null}
        {installed ? (
          <p className="text-sm text-muted-foreground">{dictionary.updateInstalled}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col gap-2 md:w-40">
        <Button onClick={handleCheckUpdate} disabled={checking || installing} variant="outline">
          {checking ? dictionary.checkingUpdate : dictionary.checkUpdate}
        </Button>
        {updateAvailable ? (
          <Button onClick={handleInstallUpdate} disabled={checking || installing}>
            {installing ? dictionary.installingUpdate : dictionary.installUpdate}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
