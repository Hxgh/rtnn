import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils";

export function AdminDetailList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <dl className={cn("grid gap-4 text-sm md:grid-cols-2", className)}>
      {children}
    </dl>
  );
}

export function AdminDetailItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words">{value || "-"}</dd>
    </div>
  );
}
