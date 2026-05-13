"use client";

import type {
  Html5Qrcode,
  Html5QrcodeResult,
  Html5QrcodeSupportedFormats,
} from "html5-qrcode";

export type ScannerContentType =
  | "url"
  | "email"
  | "phone"
  | "sms"
  | "wifi"
  | "geo"
  | "product"
  | "text";

export type WebBarcodeScanResult = {
  rawValue: string;
  format?: string;
  scannedAt: string;
  contentType: ScannerContentType;
};

export const scannerElementId = "rtnn-h5-barcode-reader";
export const barcodeScanFormats = [
  "qr_code",
  "aztec",
  "codabar",
  "code_39",
  "code_93",
  "code_128",
  "data_matrix",
  "ean_8",
  "ean_13",
  "itf",
  "pdf417",
  "upc_a",
  "upc_e",
];

function normalizeContentType(value: string): ScannerContentType {
  const text = value.trim();

  if (/^https?:\/\//i.test(text)) {
    return "url";
  }

  if (/^mailto:/i.test(text) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
    return "email";
  }

  if (/^tel:/i.test(text)) {
    return "phone";
  }

  if (/^sms:/i.test(text)) {
    return "sms";
  }

  if (/^wifi:/i.test(text)) {
    return "wifi";
  }

  if (/^geo:/i.test(text)) {
    return "geo";
  }

  if (/^\d{8,14}$/.test(text)) {
    return "product";
  }

  return "text";
}

export function normalizeWebBarcodeResult(
  rawValue: string,
  result?: Html5QrcodeResult,
): WebBarcodeScanResult {
  return normalizeBarcodeValue(rawValue, result?.result?.format?.formatName);
}

export function normalizeBarcodeValue(
  rawValue: string,
  format?: string,
): WebBarcodeScanResult {
  return {
    rawValue,
    format,
    scannedAt: new Date().toISOString(),
    contentType: normalizeContentType(rawValue),
  };
}

export async function createHtml5QrcodeScanner(elementId = scannerElementId) {
  const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");

  return {
    scanner: new Html5Qrcode(
      elementId,
      {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.AZTEC,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.PDF_417,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ] satisfies Html5QrcodeSupportedFormats[],
        useBarCodeDetectorIfSupported: true,
      },
    ),
    formats: Html5QrcodeSupportedFormats,
  };
}

export function clearScanner(scanner: Html5Qrcode) {
  try {
    scanner.clear();
  } catch {
    // Scanner cleanup can throw after permission or route-transition failures.
  }
}

export async function stopHtml5QrcodeScanner(
  scanner: Html5Qrcode,
  options?: {
    clear?: boolean;
  },
) {
  try {
    if (scanner.isScanning) {
      await scanner.stop();
    }
  } catch {
    // stop() can reject after camera permission changes or route transitions.
  }

  if (options?.clear) {
    clearScanner(scanner);
  }
}

export async function scanBarcodeImageFile(
  file: File,
  elementId = `${scannerElementId}-image`,
) {
  const { scanner } = await createHtml5QrcodeScanner(elementId);

  try {
    const result = await scanner.scanFileV2(file, false);
    return normalizeWebBarcodeResult(result.decodedText, result);
  } finally {
    clearScanner(scanner);
  }
}

export function getScannerBoxSize(width: number, height: number) {
  const minDimension = Math.min(width, height);
  const size = Math.max(192, Math.min(280, Math.floor(minDimension * 0.72)));

  return {
    width: size,
    height: size,
  };
}
