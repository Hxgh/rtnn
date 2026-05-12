"use client";

import type { NativeBridge, NativeBridgeActionResult } from "@rtnn/native-bridge";

export function buildInAppWebViewUrl(url: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const current = new URL(window.location.href);
  let target: URL;

  try {
    target = new URL(url, current.origin);
  } catch {
    return null;
  }

  if (
    target.origin !== current.origin ||
    (target.protocol !== "https:" && target.protocol !== "http:")
  ) {
    return null;
  }

  return target.toString();
}

export function navigateToInAppWebView(url: string): NativeBridgeActionResult {
  const webviewUrl = buildInAppWebViewUrl(url);

  if (!webviewUrl) {
    return {
      ok: false,
      reason: "webview-url-not-allowed",
    };
  }

  if (typeof window.location.assign === "function") {
    window.location.assign(webviewUrl);
  } else {
    window.location.href = webviewUrl;
  }
  return {
    ok: true,
    message: "opened-in-app-webview",
  };
}

export async function openInAppWebView(
  nativeBridge: NativeBridge,
  url: string,
): Promise<NativeBridgeActionResult> {
  void nativeBridge;
  return navigateToInAppWebView(url);
}
