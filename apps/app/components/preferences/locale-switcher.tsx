"use client";

import { Button } from "@/components/ui/button";
import { usePreferences } from "@/components/providers/preferences-provider";

export function LocaleSwitcher() {
  const { locale, setLocale, messages } = usePreferences();
  const prefs = messages.common.prefs;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{prefs.locale}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {locale === "zh-CN" ? prefs.chinese : prefs.english}
        </p>
      </div>
      <div className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background p-1">
        <Button
          type="button"
          size="sm"
          variant={locale === "zh-CN" ? "secondary" : "ghost"}
          onClick={() => setLocale("zh-CN")}
          aria-label={prefs.chinese}
          className="h-8 rounded-full px-3 text-xs"
        >
          中文
        </Button>
        <Button
          type="button"
          size="sm"
          variant={locale === "en-US" ? "secondary" : "ghost"}
          onClick={() => setLocale("en-US")}
          aria-label={prefs.english}
          className="h-8 rounded-full px-3 text-xs"
        >
          EN
        </Button>
      </div>
    </div>
  );
}
