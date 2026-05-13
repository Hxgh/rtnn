"use client";

import type { AppMessages } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { SurfaceCard } from "@/components/ui/card";

type Messages = AppMessages["nativeCapabilities"];

export function SafeAreaPanel({ messages }: { messages: Messages }) {
  return (
    <div className="space-y-5">
      <SurfaceCard className="overflow-hidden">
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">
              {messages.safeAreaTitle}
            </h2>
            <p className="text-xs leading-5 text-muted-foreground">
              {messages.safeAreaDescription}
            </p>
          </div>
          <Input
            id="native-safe-area-input"
            inputMode="text"
            placeholder={messages.keyboardPlaceholder}
          />
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="space-y-3 px-4 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            {messages.safeAreaBottomTitle}
          </h2>
          <p className="text-xs leading-5 text-muted-foreground">
            {messages.safeAreaBottomDescription}
          </p>
          <div className="rounded-2xl border border-border bg-secondary px-4 py-6 text-center text-sm text-muted-foreground">
            {messages.safeAreaBottomMarker}
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
