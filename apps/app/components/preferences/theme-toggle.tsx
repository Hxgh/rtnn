"use client";

import { Button } from "@/components/ui/button";
import { usePreferences } from "@/components/providers/preferences-provider";
import type { ThemeMode } from "@/lib/i18n";

const ORDERED_THEME: ThemeMode[] = ["light", "dark", "system"];

function getThemeLabel(theme: ThemeMode, labels: ReturnType<typeof usePreferences>["messages"]["common"]["prefs"]) {
  if (theme === "light") {
    return labels.light;
  }
  if (theme === "dark") {
    return labels.dark;
  }
  return labels.system;
}

function getThemeShortLabel(theme: ThemeMode) {
  if (theme === "light") {
    return "L";
  }
  if (theme === "dark") {
    return "D";
  }
  return "S";
}

export function ThemeToggle() {
  const { theme, setTheme, messages } = usePreferences();
  const prefs = messages.common.prefs;

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{prefs.theme}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {getThemeLabel(theme, prefs)}
        </p>
      </div>
      <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-border/80 bg-background p-1">
        {ORDERED_THEME.map((item) => (
          <Button
            key={item}
            type="button"
            variant={theme === item ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTheme(item)}
            aria-label={`${prefs.theme}: ${getThemeLabel(item, prefs)}`}
            className="h-8 rounded-full px-3 text-xs"
            title={`${prefs.theme}: ${getThemeLabel(item, prefs)}`}
          >
            {getThemeShortLabel(item)}
          </Button>
        ))}
      </div>
    </div>
  );
}
