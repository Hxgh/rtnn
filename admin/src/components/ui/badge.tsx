import type { HTMLAttributes } from "react";
import { cn } from "@/src/lib/utils";

type BadgeVariant = "default" | "secondary" | "outline";

const badgeVariantClasses: Record<BadgeVariant, string> = {
  default: "bg-primary/14 text-primary",
  secondary: "bg-secondary text-secondary-foreground",
  outline: "border border-border text-foreground",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        badgeVariantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
