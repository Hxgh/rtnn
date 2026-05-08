"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePreferences } from "@/components/providers/preferences-provider";
import { cn } from "@/lib/utils";

function HomeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.75 10.5 12 4l8.25 6.5" />
      <path d="M5.25 9.9V19a1 1 0 0 0 1 1h3.75v-5.25a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3.75a1 1 0 0 0 1-1V9.9" />
    </svg>
  );
}

function MeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 12a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" />
      <path d="M5 19.25a7.25 7.25 0 0 1 14 0" />
    </svg>
  );
}

export function BottomTabBar({ enabled = true }: { enabled?: boolean }) {
  const pathname = usePathname();
  const { messages } = usePreferences();
  const showTabBar = enabled && (pathname === "/" || pathname === "/me");

  if (!showTabBar) {
    return null;
  }

  const tabs = [
    {
      href: "/",
      label: messages.common.nav.home,
      active: pathname === "/",
      icon: HomeIcon,
    },
    {
      href: "/me",
      label: messages.common.nav.me,
      active: pathname.startsWith("/me") || pathname.startsWith("/account"),
      icon: MeIcon,
    },
  ];

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
      <div className="mx-auto w-full max-w-[28rem] bg-background">
        <div className="pointer-events-auto border-t border-border/70 bg-background px-5 pt-1 pb-[var(--rtnn-bottom-nav-spacing)]">
          <div className="grid h-[var(--rtnn-bottom-bar-height)] grid-cols-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 px-3 text-[11px] transition-colors active:bg-secondary/70",
                    tab.active
                      ? "font-semibold text-foreground"
                      : "font-medium text-muted-foreground hover:text-foreground",
                  )}
                  aria-current={tab.active ? "page" : undefined}
                >
                  <span className="flex size-8 items-center justify-center">
                    <Icon />
                  </span>
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
