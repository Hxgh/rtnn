"use client";

import { useMediaPicker } from "@/lib/native-core";
import type { AppMessages } from "@/lib/i18n";
import {
  MediaPickerActions,
  MediaPreviewGrid,
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
  const picker = useMediaPicker();
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
          <MediaPickerActions
            labels={{
              captureImage: messages.captureImage,
              opening: messages.openingShort,
              pickImages: messages.pickImages,
            }}
            picker={picker}
          />
        </div>
      </SurfaceCard>

      {picker.files.length > 0 ? (
        <SurfaceCard className="overflow-hidden">
          <div className="px-4 py-4">
            <MediaPreviewGrid
              labels={{
                clear: messages.clearImages,
                title: messages.selectedImages,
              }}
              picker={picker}
            />
          </div>
        </SurfaceCard>
      ) : null}

      {displayMessage ? (
        <p className="break-words rounded-xl bg-secondary px-3 py-2 text-xs leading-5 text-muted-foreground">
          {displayMessage}
        </p>
      ) : null}
    </div>
  );
}
