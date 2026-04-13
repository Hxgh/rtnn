import type * as React from "react";
import { cn } from "@/src/lib/utils";

type RtnnLogoMarkProps = React.SVGProps<SVGSVGElement>;

export function RtnnLogoMark({ className, ...props }: RtnnLogoMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-8 shrink-0", className)}
      {...props}
    >
      <circle cx="32" cy="32" r="28" fill="black" />
      <path
        d="M23 18H35.5C42.404 18 47 22.104 47 28.2C47 32.945 43.966 36.149 39.2 37.33L47.5 46"
        stroke="white"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23 18V46"
        stroke="white"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23 33.25H35"
        stroke="white"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RtnnLogoLockup({
  className,
  showMark = true,
  title = "RTNN",
  subtitle,
}: {
  className?: string;
  showMark?: boolean;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {showMark ? <RtnnLogoMark /> : null}
      <div className="grid min-w-0 text-left leading-none">
        <span className="truncate text-[13px] font-semibold tracking-[0.22em] text-foreground uppercase">
          {title}
        </span>
        {subtitle ? (
          <span className="mt-1 truncate text-[10px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
            {subtitle}
          </span>
        ) : null}
      </div>
    </div>
  );
}
