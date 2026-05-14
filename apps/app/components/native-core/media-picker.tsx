"use client";

import type { UseMediaPickerReturn } from "@/lib/native-core";
import { cn } from "@/lib/utils";

export type MediaImagePickerLabels = {
  opening: string;
  pickImages: string;
  remove: string;
};

export function formatNativeFileSize(value: number) {
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function MediaAddTile({
  className,
  labels,
  picker,
}: {
  className?: string;
  labels: MediaImagePickerLabels;
  picker: UseMediaPickerReturn;
}) {
  return (
    <button
      aria-label={labels.pickImages}
      className={cn(
        "group grid aspect-square w-full place-items-center rounded-2xl border border-dashed border-border/90 bg-secondary/40 text-left transition-colors active:bg-secondary disabled:pointer-events-none disabled:opacity-60",
        className,
      )}
      disabled={picker.isOpening}
      onClick={() => void picker.pickMedia("album")}
      type="button"
    >
      <span className="flex flex-col items-center gap-2 text-center">
        <span className="relative block size-9 rounded-xl border border-border bg-background shadow-sm">
          <span className="absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 bg-foreground" />
          <span className="absolute left-1/2 top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-foreground" />
        </span>
        <span className="text-xs font-medium text-foreground">
          {picker.isOpening ? labels.opening : labels.pickImages}
        </span>
      </span>
    </button>
  );
}

export function MediaImagePicker({
  className,
  labels,
  picker,
}: {
  className?: string;
  labels: MediaImagePickerLabels;
  picker: UseMediaPickerReturn;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-3 gap-2">
        {picker.files.map((image, index) => (
          <div
            className="relative overflow-hidden rounded-2xl border border-border/80 bg-secondary"
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
            <button
              aria-label={`${labels.remove} ${index + 1}`}
              className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur active:bg-background"
              onClick={() => picker.removeFile(index)}
              type="button"
            >
              <span aria-hidden="true" className="text-base leading-none">
                ×
              </span>
            </button>
            <p className="absolute bottom-0 left-0 right-0 truncate bg-black/55 px-2 py-1 text-[10px] text-white">
              {formatNativeFileSize(image.size)}
            </p>
          </div>
        ))}
        {picker.files.length < picker.maxFiles ? (
          <MediaAddTile labels={labels} picker={picker} />
        ) : null}
      </div>
    </div>
  );
}
