import type { ReactNode } from "react";
import { AdminEmptyValue } from "@/src/components/admin/table-display";
import { cn } from "@/src/lib/utils";

export function AdminDetailList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <dl className={cn("grid min-w-0 gap-4 text-sm md:grid-cols-2", className)}>
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
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 min-w-0 break-words">{value || <AdminEmptyValue />}</dd>
    </div>
  );
}
