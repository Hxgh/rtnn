"use client";

import { useMemo, useState } from "react";
import {
  createAppNativeCore,
  isNativeActionCancelled,
  type NativeCorePickedFile,
  type NativeCoreService,
  type NativeMediaSource,
} from "@/lib/native-core";
import type { AppMessages } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";

type Messages = AppMessages["nativeCapabilities"];
type MediaActionState = "idle" | "opening";

function formatFileSize(value: number) {
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

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
  const nativeCore = useMemo<NativeCoreService>(() => createAppNativeCore(), []);
  const [mediaActionState, setMediaActionState] = useState<MediaActionState>("idle");
  const [images, setImages] = useState<NativeCorePickedFile[]>([]);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  async function pickMedia(source: NativeMediaSource) {
    if (mediaActionState !== "idle") {
      return;
    }

    setMediaActionState("opening");
    setLastMessage(null);

    try {
      const result = await nativeCore.pickMedia(source, {
        timeoutMs: 12_000,
      });

      if (result.ok) {
        setImages(result.files);
        return;
      }

      setLastMessage(
        isNativeActionCancelled(result)
          ? null
          : (result.reason ?? "media-action-failed"),
      );
    } catch (error) {
      setLastMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setMediaActionState("idle");
    }
  }

  const displayMessage = getMediaMessage(lastMessage, messages);
  const isOpening = mediaActionState === "opening";

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
          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={isOpening}
              onClick={() => pickMedia("album")}
              type="button"
              variant="outline"
            >
              {isOpening ? messages.openingShort : messages.pickImages}
            </Button>
            <Button
              disabled={isOpening}
              onClick={() => pickMedia("camera")}
              type="button"
            >
              {isOpening ? messages.openingShort : messages.captureImage}
            </Button>
          </div>
        </div>
      </SurfaceCard>

      {images.length > 0 ? (
        <SurfaceCard className="overflow-hidden">
          <div className="space-y-3 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                {messages.selectedImages}
              </h2>
              <Button onClick={() => setImages([])} size="sm" variant="ghost">
                {messages.clearImages}
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {images.map((image, index) => (
                <div
                  className="overflow-hidden rounded-xl border border-border/80 bg-secondary"
                  key={`${image.name}:${image.size}:${index}`}
                >
                  {image.dataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={image.name}
                      className="aspect-square w-full object-cover"
                      src={image.dataUrl}
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center px-2 text-center text-[10px] text-muted-foreground">
                      {image.name}
                    </div>
                  )}
                  <div className="space-y-0.5 px-2 py-1.5">
                    <p className="truncate text-[10px] text-foreground">{image.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatFileSize(image.size)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
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
