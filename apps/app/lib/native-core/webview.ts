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

export function navigateToInAppWebView(url: string): NativeBridgeActionResult {
  const webviewUrl = buildInAppWebViewUrl(url);

  if (!webviewUrl) {
    return {
      ok: false,
      reason: "webview-url-not-allowed",
    };
  }

  window.location.assign(webviewUrl);
  return {
    ok: true,
    message: "opened-in-app-webview",
  };
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
