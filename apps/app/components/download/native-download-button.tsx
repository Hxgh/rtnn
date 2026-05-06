"use client";

import { useState } from "react";
import { createNativeBridge } from "@rtnn/native-bridge";
import { Button } from "@/components/ui/button";

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

  async function handleDownload() {
    setFailed(false);
    const result = await createNativeBridge().openExternal({ url });

    if (!result.ok) {
      setFailed(true);
    }
  }

  return (
    <div className="space-y-2">
      <Button className="w-full" onClick={handleDownload}>
        {label}
      </Button>
      {failed ? (
        <p className="text-xs leading-5 text-destructive">{failedLabel}</p>
      ) : null}
    </div>
  );
}
