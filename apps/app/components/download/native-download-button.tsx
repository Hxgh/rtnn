"use client";

import type { MouseEvent } from "react";
import { useState } from "react";
import { createNativeBridge } from "@rtnn/native-bridge";
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

  async function handleDownload(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    setFailed(false);
    const bridge = createNativeBridge();
    const result = await bridge.openExternal({ url });

    if (!result.ok) {
      const info = await bridge.getClientInfo().catch(() => null);
      if (info?.runtime === "browser") {
        window.location.assign(url);
        return;
      }
      setFailed(true);
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
        {label}
      </a>
      {failed ? (
        <p className="text-xs leading-5 text-destructive">{failedLabel}</p>
      ) : null}
    </div>
  );
}
