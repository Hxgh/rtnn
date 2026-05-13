"use client";

import type { ReactNode } from "react";
import type { UseMediaPickerReturn } from "@/lib/native-core";
import { Button } from "@/components/ui/button";

export type MediaPickerActionLabels = {
  pickImages: ReactNode;
  captureImage: ReactNode;
  opening: ReactNode;
};

export type MediaPreviewLabels = {
  title: ReactNode;
  clear: ReactNode;
};

export function formatNativeFileSize(value: number) {
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function MediaPickerActions({
  labels,
  picker,
}: {
  labels: MediaPickerActionLabels;
  picker: UseMediaPickerReturn;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        disabled={picker.isOpening}
        onClick={() => void picker.pickMedia("album")}
        type="button"
        variant="outline"
      >
        {picker.isOpening ? labels.opening : labels.pickImages}
      </Button>
      <Button
        disabled={picker.isOpening}
        onClick={() => void picker.pickMedia("camera")}
        type="button"
      >
        {picker.isOpening ? labels.opening : labels.captureImage}
      </Button>
    </div>
  );
}

export function MediaPreviewGrid({
  labels,
  picker,
}: {
  labels: MediaPreviewLabels;
  picker: UseMediaPickerReturn;
}) {
  if (picker.files.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          {labels.title}
        </h2>
        <Button onClick={picker.clearFiles} size="sm" variant="ghost">
          {labels.clear}
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {picker.files.map((image, index) => (
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
                {formatNativeFileSize(image.size)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
