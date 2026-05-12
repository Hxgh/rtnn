"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogoMark } from "@/components/brand/brand-logo";
import { usePreferences } from "@/components/providers/preferences-provider";

function BackIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M15 18 9 12l6-6" />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { messages } = usePreferences();
  const isAccountPage = pathname.startsWith("/account");
  const isDeviceServicesPage =
    pathname.startsWith("/device-services") ||
    pathname.startsWith("/native-diagnostics");
  const isDownloadPage = pathname.startsWith("/download");
  const isSubPage = isAccountPage || isDeviceServicesPage || isDownloadPage;
  const backHref = isAccountPage || isDeviceServicesPage ? "/me" : "/";
  const currentTitle =
    isAccountPage
      ? messages.security.title
      : isDeviceServicesPage
          ? pathname.startsWith("/native-diagnostics")
            ? messages.nativeCapabilities.diagnosticsTitle
            : pathname.startsWith("/device-services/scan")
            ? messages.nativeCapabilities.barcodeTitle
            : messages.nativeCapabilities.title
      : isDownloadPage
          ? messages.download.title
          : pathname.startsWith("/me")
            ? messages.common.nav.me
            : messages.common.nav.home;

  return (
    <header className="shrink-0 border-b border-border/65 bg-background/98 backdrop-blur">
      <div className="mx-auto grid h-[calc(2.75rem_+_var(--rtnn-safe-top))] w-full max-w-[28rem] grid-cols-[3rem_1fr_3rem] items-end px-2 pb-1.5 pt-[var(--rtnn-safe-top)]">
        <div className="flex h-11 items-center justify-start">
          {isSubPage ? (
            <Link
              href={backHref}
              className="flex size-10 items-center justify-center rounded-full text-foreground active:bg-secondary"
              aria-label={messages.common.actions.back}
            >
              <BackIcon />
            </Link>
          ) : pathname === "/" ? (
            <div className="flex size-10 items-center justify-center">
              <BrandLogoMark className="size-7" />
            </div>
          ) : null}
        </div>
        <h1 className="min-w-0 self-center truncate text-center text-[17px] font-semibold leading-6 text-foreground">
          {currentTitle}
        </h1>
        <div className="h-11" aria-hidden="true" />
      </div>
    </header>
  );
}
