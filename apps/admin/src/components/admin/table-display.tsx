import { Badge } from "@/src/components/ui/badge";
import { cn } from "@/src/lib/utils";

export type AdminStatusTone = "success" | "warning" | "danger" | "neutral";

export function AdminEmptyValue({ className }: { className?: string }) {
  return <span className={cn("text-muted-foreground", className)}>-</span>;
}

export function AdminTextValue({
  children,
  className,
  maxWidthClassName = "max-w-72",
  mono = false,
}: {
  children?: string | null;
  className?: string;
  maxWidthClassName?: string;
  mono?: boolean;
}) {
  if (!children) {
    return <AdminEmptyValue />;
  }

  return (
    <span
      className={cn(
        "block truncate",
        maxWidthClassName,
        mono && "font-mono text-xs",
        className,
      )}
      title={children}
    >
      {children}
    </span>
  );
}

export function AdminBadgeList({
  emptyClassName,
  formatValue = (value) => value,
  maxWidthClassName = "max-w-64",
  values,
}: {
  emptyClassName?: string;
  formatValue?: (value: string) => string;
  maxWidthClassName?: string;
  values?: readonly string[];
}) {
  if (!values || values.length === 0) {
    return <AdminEmptyValue className={emptyClassName} />;
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", maxWidthClassName)}>
      {values.map((value) => (
        <Badge
          key={value}
          className="max-w-full truncate normal-case tracking-normal"
          title={formatValue(value)}
          variant="outline"
        >
          {formatValue(value)}
        </Badge>
      ))}
    </div>
  );
}

export function AdminReferenceBadgeList({
  values,
}: {
  values?: ReadonlyArray<{ id?: string; name: string }>;
}) {
  return <AdminBadgeList values={values?.map((item) => item.name)} />;
}

export function AdminFilterSummary({
  items,
}: {
  items: ReadonlyArray<string | undefined | null | false>;
}) {
  const labels = items.filter(Boolean) as string[];
  if (labels.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {labels.map((label) => (
        <Badge
          key={label}
          className="normal-case tracking-normal"
          variant="secondary"
        >
          {label}
        </Badge>
      ))}
    </div>
  );
}
