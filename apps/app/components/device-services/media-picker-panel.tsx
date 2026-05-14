"use client";

import { useMediaPicker } from "@/lib/native-core";
import type { AppMessages } from "@/lib/i18n";
import {
  MediaImagePicker,
} from "@/components/native-core";
import { SurfaceCard } from "@/components/ui/card";

type Messages = AppMessages["nativeCapabilities"];

function getMediaMessage(reason: string | null, messages: Messages) {
  if (!reason) {
    return null;
  }

  if (
    reason === "file-picker-cancelled" ||
    reason === "cancelled" ||
    reason === "canceled" ||
    reason.toLowerCase().includes("cancel")
  ) {
    return null;
  }

  if (reason.endsWith("-permission-denied") || reason === "permission-denied") {
    return messages.permissionDenied;
  }

  return messages.failed;
}

export function MediaPickerPanel({ messages }: { messages: Messages }) {
  const picker = useMediaPicker({
    compress: {
      enabled: true,
      maxDimension: 1600,
      quality: 0.82,
    },
    maxFiles: 9,
  });
  const displayMessage = getMediaMessage(picker.reason, messages);

  return (
    <div className="space-y-5">
      <SurfaceCard className="overflow-hidden">
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">{messages.mediaTitle}</h2>
            <p className="text-xs leading-5 text-muted-foreground">
              {messages.mediaDescription}
            </p>
          </div>
          <MediaImagePicker
            labels={{
              opening: messages.openingShort,
              pickImages: messages.pickImages,
              remove: messages.removeImage,
            }}
            picker={picker}
          />
        </div>
      </SurfaceCard>

      {displayMessage ? (
        <p className="break-words rounded-xl bg-secondary px-3 py-2 text-xs leading-5 text-muted-foreground">
          {displayMessage}
        </p>
      ) : null}
    </div>
  );
}
