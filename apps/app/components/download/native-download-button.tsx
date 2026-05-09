"use client";

import type { MouseEvent } from "react";
import { useEffect, useState } from "react";
import { createAppNativeCore, runNativeActionWithWatchdog } from "@/lib/native-core";
import { buttonVariants } from "@/components/ui/button";

type NativeDownloadButtonProps = {
  url: string;
  label: string;
  failedLabel: string;
};

export function NativeDownloadButton({
  url,
  label,
  failedLabel,
}: NativeDownloadButtonProps) {
  const [failed, setFailed] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!opening) {
      return;
    }

    let leftPage = false;
    const finish = () => {
      if (leftPage) {
        window.setTimeout(() => setOpening(false), 500);
      }
    };
    const handleLeave = () => {
      leftPage = true;
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleLeave();
        return;
      }

      if (document.visibilityState === "visible") {
        finish();
      }
    };

    window.addEventListener("blur", handleLeave);
    window.addEventListener("focus", finish);
    window.addEventListener("pagehide", handleLeave);
    window.addEventListener("pageshow", finish);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleLeave);
      window.removeEventListener("focus", finish);
      window.removeEventListener("pagehide", handleLeave);
      window.removeEventListener("pageshow", finish);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [opening]);

  async function handleDownload(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    setFailed(false);
    setOpening(true);
    const nativeCore = createAppNativeCore();

    try {
      const result = await runNativeActionWithWatchdog(() =>
        nativeCore.openExternalUrl(url),
      );

      if (!result.ok) {
        const snapshot = await nativeCore.getRuntimeSnapshot().catch(() => null);
        const info = snapshot?.clientInfo ?? null;
        if (info?.runtime === "browser") {
          window.location.assign(url);
          return;
        }
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      window.setTimeout(() => setOpening(false), 600);
    }
  }

  return (
    <div className="space-y-2">
      <a
        className={buttonVariants({ className: "w-full" })}
        href={url}
        onClick={handleDownload}
        rel="noopener noreferrer"
        target="_blank"
      >
        {opening ? `${label}...` : label}
      </a>
      {failed ? (
        <p className="text-xs leading-5 text-destructive">{failedLabel}</p>
      ) : null}
    </div>
  );
}
