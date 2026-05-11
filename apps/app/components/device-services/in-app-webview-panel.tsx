"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { AppMessages } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";

type Messages = AppMessages["nativeCapabilities"];

function resolveAllowedWebViewUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const current = new URL(window.location.href);
    const url = new URL(value, current.origin);

    return url.origin === current.origin && (url.protocol === "https:" || url.protocol === "http:")
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function InAppWebViewPanel({
  messages,
  initialUrl,
}: {
  messages: Messages;
  initialUrl?: string | null;
}) {
  const searchParams = useSearchParams();
  const url = searchParams.get("url") ?? initialUrl ?? null;
  const targetUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return resolveAllowedWebViewUrl(url);
  }, [url]);

  if (!targetUrl) {
    return (
      <SurfaceCard className="px-4 py-4">
        <p className="text-sm leading-6 text-muted-foreground">
          {messages.webviewUnavailable}
        </p>
      </SurfaceCard>
    );
  }

  return (
    <div className="space-y-4">
      <SurfaceCard className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {messages.webviewCurrentPage}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {targetUrl}
            </p>
          </div>
          <Button
            onClick={() => {
            window.location.reload();
          }}
            size="sm"
            variant="ghost"
          >
          {messages.mapRefresh}
          </Button>
        </div>
        <div className="h-[68vh] min-h-[28rem] bg-background">
          <iframe
            className="h-full w-full border-0"
            referrerPolicy="same-origin"
            sandbox="allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
            src={targetUrl}
            title={messages.openInAppWebView}
          />
        </div>
      </SurfaceCard>
    </div>
  );
}
