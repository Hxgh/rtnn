"use client";

import type { NativePickedFile } from "@rtnn/native-bridge";

export type ImageCompressionOptions = {
  enabled?: boolean;
  maxDimension?: number;
  quality?: number;
  outputType?: "image/jpeg" | "image/png" | "image/webp";
};

const DEFAULT_COMPRESSION: Required<ImageCompressionOptions> = {
  enabled: true,
  maxDimension: 1600,
  outputType: "image/jpeg",
  quality: 0.82,
};

function normalizeCompressionOptions(
  options: boolean | ImageCompressionOptions | undefined,
) {
  if (options === false) {
    return {
      ...DEFAULT_COMPRESSION,
      enabled: false,
    };
  }

  if (options === true || !options) {
    return DEFAULT_COMPRESSION;
  }

  return {
    ...DEFAULT_COMPRESSION,
    ...options,
    enabled: options.enabled ?? true,
  };
}

function dataUrlToBlob(dataUrl: string) {
  const [header = "", payload = ""] = dataUrl.split(",");
  const mime = header.match(/^data:([^;]+);base64$/)?.[1] ?? "image/jpeg";
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mime });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("image-compression-invalid-data-url"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("image-compression-failed"));
    reader.readAsDataURL(blob);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image-compression-image-load-failed"));
    image.decoding = "async";
    image.src = dataUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function getTargetSize(width: number, height: number, maxDimension: number) {
  const longest = Math.max(width, height);

  if (longest <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / longest;

  return {
    height: Math.max(1, Math.round(height * scale)),
    width: Math.max(1, Math.round(width * scale)),
  };
}

function renameForOutputType(name: string, outputType: string) {
  if (outputType === "image/png") {
    return name.replace(/\.[^.]+$/, "") + ".png";
  }

  if (outputType === "image/webp") {
    return name.replace(/\.[^.]+$/, "") + ".webp";
  }

  return name.replace(/\.[^.]+$/, "") + ".jpg";
}

export async function compressPickedImage(
  file: NativePickedFile,
  options?: boolean | ImageCompressionOptions,
): Promise<NativePickedFile> {
  const config = normalizeCompressionOptions(options);

  if (
    !config.enabled ||
    !file.dataUrl ||
    !file.type.startsWith("image/") ||
    typeof document === "undefined"
  ) {
    return file;
  }

  try {
    const originalBlob = dataUrlToBlob(file.dataUrl);
    const image = await loadImage(file.dataUrl);
    const target = getTargetSize(
      image.naturalWidth || image.width,
      image.naturalHeight || image.height,
      config.maxDimension,
    );

    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, target.width, target.height);

    const blob = await canvasToBlob(canvas, config.outputType, config.quality);

    if (!blob || blob.size >= originalBlob.size) {
      return file;
    }

    return {
      dataUrl: await blobToDataUrl(blob),
      name: renameForOutputType(file.name || "image", config.outputType),
      size: blob.size,
      type: blob.type || config.outputType,
    };
  } catch {
    return file;
  }
}

export async function compressPickedImages(
  files: NativePickedFile[],
  options?: boolean | ImageCompressionOptions,
) {
  return Promise.all(files.map((file) => compressPickedImage(file, options)));
}
