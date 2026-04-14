"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TEMPLATE_IDENTITY } from "@rtnn/config";
import { RtnnLogoMark } from "@/components/brand/rtnn-logo";
import { usePreferences } from "@/components/providers/preferences-provider";

export function SiteHeader() {
  const pathname = usePathname();
  const { messages } = usePreferences();
  const isSubPage = pathname.startsWith("/account");
  const currentTitle =
    isSubPage ? messages.security.title : pathname.startsWith("/me") ? messages.common.nav.me : messages.common.nav.home;

  if (isSubPage) {
    return (
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/96 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[28rem] items-center gap-3 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3">
          <Link
            href="/me"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background text-foreground"
            aria-label={messages.common.actions.back}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18 9 12l6-6" />
            </svg>
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{currentTitle}</p>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/96 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[28rem] items-center gap-3 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <RtnnLogoMark className="size-8" />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              {`${TEMPLATE_IDENTITY.projectId} app`}
            </p>
            <p className="truncate text-sm font-semibold text-foreground">{currentTitle}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
