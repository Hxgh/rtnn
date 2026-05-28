import type * as React from "react";
import Image, { type ImageProps } from "next/image";
import { TEMPLATE_DISPLAY } from "@rtnn/config";
import { cn } from "@/src/lib/utils";

type BrandLogoMarkProps = Omit<
  ImageProps,
  "alt" | "src" | "width" | "height" | "unoptimized"
>;

export function BrandLogoMark({ className, ...props }: BrandLogoMarkProps) {
  return (
    <Image
      alt=""
      className={cn("size-8 shrink-0", className)}
      height={32}
      src="/brand/brand-mark.svg"
      unoptimized
      width={32}
      {...props}
    />
  );
}

export function BrandLogoLockup({
  className,
  showMark = true,
  title = TEMPLATE_DISPLAY.brand,
  subtitle,
}: {
  className?: string;
  showMark?: boolean;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {showMark ? <BrandLogoMark /> : null}
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
