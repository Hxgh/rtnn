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
      className="h-5 w-5"
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
      className="h-5 w-5"
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

export function BottomTabBar() {
  const pathname = usePathname();
  const { messages } = usePreferences();
  const showTabBar = pathname === "/" || pathname === "/me";

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
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-background/98 backdrop-blur">
      <div className="mx-auto grid w-full max-w-[28rem] grid-cols-2 px-6 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 px-3 text-[11px] font-medium transition-colors",
                tab.active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={tab.active ? "page" : undefined}
            >
              <span className="relative flex h-6 items-center justify-center">
                {tab.active ? (
                  <span className="absolute -top-1 h-0.5 w-4 rounded-full bg-foreground" />
                ) : null}
                <Icon />
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
