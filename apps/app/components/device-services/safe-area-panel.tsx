"use client";

import type { AppMessages } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { SurfaceCard } from "@/components/ui/card";

type Messages = AppMessages["nativeCapabilities"];

export function SafeAreaPanel({ messages }: { messages: Messages }) {
  return (
    <div className="grid min-h-[calc(100dvh-9rem)] grid-rows-[auto_1fr_auto] gap-5">
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
            placeholder={messages.safeAreaMiddleInputPlaceholder}
          />
        </div>
      </SurfaceCard>

      <div aria-hidden="true" />

      <div className="rtnn-native-bottom-surface sticky bottom-0 border-t border-border bg-background pt-3 pb-3">
        <Input
          id="native-safe-area-bottom-input"
          inputMode="text"
          placeholder={messages.safeAreaBottomInputPlaceholder}
        />
      </div>
    </div>
  );
}
