"use client";

import type { NativeBridge, NativeBridgeActionResult } from "@rtnn/native-bridge";

function canUseHttpUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function buildInAppWebViewUrl(url: string) {
  if (typeof window === "undefined" || !canUseHttpUrl(url)) {
    return null;
  }

  const current = new URL(window.location.href);
  const target = new URL(url);

  if (
    current.pathname === "/device-services/webview" &&
    current.searchParams.get("url") === target.toString()
  ) {
    return current.toString();
  }

  const webviewUrl = new URL("/device-services/webview", current.origin);
  webviewUrl.searchParams.set("url", target.toString());
  return webviewUrl.toString();
}

export async function openInAppWebView(
  nativeBridge: NativeBridge,
  url: string,
): Promise<NativeBridgeActionResult> {
  const webviewUrl = buildInAppWebViewUrl(url);

  if (!webviewUrl) {
    return {
      ok: false,
      reason: "webview-url-not-allowed",
    };
  }

  return nativeBridge.openInAppWebView({ url: webviewUrl });
}
