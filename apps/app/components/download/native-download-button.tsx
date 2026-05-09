"use client";

import type { MouseEvent } from "react";
import { useState } from "react";
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
