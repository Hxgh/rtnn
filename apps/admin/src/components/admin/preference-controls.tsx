"use client";

import type * as React from "react";
import { useSyncExternalStore } from "react";
import {
  Check,
  Expand,
  Languages,
  MonitorCog,
  Moon,
  Shrink,
  Sun,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { usePreferences } from "@/src/components/providers/preferences-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import type { AdminDictionary } from "@/src/i18n/dictionaries";
import type { AdminLocale, AdminTheme } from "@/src/lib/preferences";
import { cn } from "@/src/lib/utils";

type PreferenceControlsProps = {
  dictionary: AdminDictionary["common"];
  className?: string;
  showFullscreen?: boolean;
};

const themeOrder: AdminTheme[] = ["light", "dark", "system"];
const localeOrder: AdminLocale[] = ["zh-CN", "en-US"];
const toolbarIconButtonClassName =
  "size-8 rounded-md border border-transparent text-muted-foreground shadow-none [&_svg]:size-[15px] hover:border-border/60 hover:bg-accent hover:text-accent-foreground data-[state=open]:border-border/60 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground";

function ToolbarIconButton({
  label,
  title,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size" | "variant"> & {
  label: string;
  title?: string;
}) {
  return (
    <Button
      aria-label={label}
      className={cn(toolbarIconButtonClassName, className)}
      size="icon-sm"
      title={title ?? label}
      type="button"
      variant="ghost"
      {...props}
    >
      {children}
      <span className="sr-only">{label}</span>
    </Button>
  );
}

function CheckIcon({ active }: { active: boolean }) {
  return <Check aria-hidden className={cn("ml-auto size-4", !active && "opacity-0")} />;
}

function getFullscreenSnapshot() {
  if (
    typeof document === "undefined" ||
    typeof document.documentElement.requestFullscreen !== "function" ||
    document.fullscreenEnabled === false
  ) {
    return "unsupported" as const;
  }

  return document.fullscreenElement ? ("fullscreen" as const) : ("windowed" as const);
}

function getFullscreenServerSnapshot() {
  return "unsupported" as const;
}

function subscribeFullscreenChange(callback: () => void) {
  if (typeof document === "undefined") {
    return () => {};
  }

  document.addEventListener("fullscreenchange", callback);
  return () => {
    document.removeEventListener("fullscreenchange", callback);
  };
}

export function useFullscreenState(dictionary: AdminDictionary["common"]) {
  const fullscreenSnapshot = useSyncExternalStore(
    subscribeFullscreenChange,
    getFullscreenSnapshot,
    getFullscreenServerSnapshot,
  );
  const isFullscreenSupported = fullscreenSnapshot !== "unsupported";
  const isFullscreen = fullscreenSnapshot === "fullscreen";

  async function toggleFullscreen() {
    if (!isFullscreenSupported) {
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await document.documentElement.requestFullscreen();
  }

  const fullscreenLabel = isFullscreen
    ? dictionary.exitFullscreen
    : dictionary.enterFullscreen;

  return {
    fullscreenLabel,
    isFullscreen,
    isFullscreenSupported,
    toggleFullscreen,
  };
}

export function FullscreenControl({
  dictionary,
}: {
  dictionary: AdminDictionary["common"];
}) {
  const { fullscreenLabel, isFullscreen, isFullscreenSupported, toggleFullscreen } =
    useFullscreenState(dictionary);

  if (!isFullscreenSupported) {
    return null;
  }

  return (
    <ToolbarIconButton
      label={fullscreenLabel}
      onClick={() => {
        void toggleFullscreen();
      }}
    >
      {isFullscreen ? <Shrink /> : <Expand />}
    </ToolbarIconButton>
  );
}

export function ThemeControl({
  dictionary,
}: {
  dictionary: AdminDictionary["common"];
}) {
  const { theme, setTheme } = usePreferences();
  const ThemeIndicator = theme === "light" ? Sun : theme === "dark" ? Moon : MonitorCog;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ToolbarIconButton label={dictionary.theme}>
          <ThemeIndicator />
        </ToolbarIconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-44">
        <DropdownMenuLabel>{dictionary.theme}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themeOrder.map((item) => {
          const active = item === theme;
          const label =
            item === "light"
              ? dictionary.light
              : item === "dark"
                ? dictionary.dark
                : dictionary.system;
          const Icon = item === "light" ? Sun : item === "dark" ? Moon : MonitorCog;

          return (
            <DropdownMenuItem
              key={item}
              onSelect={() => {
                setTheme(item);
              }}
            >
              <Icon />
              <span>{label}</span>
              <CheckIcon active={active} />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LocaleControl({
  dictionary,
}: {
  dictionary: AdminDictionary["common"];
}) {
  const { locale, setLocale } = usePreferences();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ToolbarIconButton label={dictionary.locale}>
          <Languages className="size-4" />
        </ToolbarIconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40">
        <DropdownMenuLabel>{dictionary.locale}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {localeOrder.map((item) => {
          const active = item === locale;
          const label = item === "zh-CN" ? dictionary.chinese : dictionary.english;

          return (
            <DropdownMenuItem
              key={item}
              onSelect={() => {
                setLocale(item);
              }}
            >
              <span>{label}</span>
              <CheckIcon active={active} />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PreferenceControls({
  dictionary,
  className,
  showFullscreen = false,
}: PreferenceControlsProps) {
  const { isFullscreenSupported } = useFullscreenState(dictionary);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {showFullscreen && isFullscreenSupported ? (
        <FullscreenControl dictionary={dictionary} />
      ) : null}
      <ThemeControl dictionary={dictionary} />
      <LocaleControl dictionary={dictionary} />
    </div>
  );
}
