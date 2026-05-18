import { Card, CardContent } from "@/src/components/ui/card";
import { cn } from "@/src/lib/utils";

type AdminStateVariant = "empty" | "error" | "warning";

function variantClassName(variant: AdminStateVariant) {
  if (variant === "error") {
    return "border-red-300/45 bg-red-50/60 dark:border-red-400/30 dark:bg-red-900/10";
  }
  if (variant === "warning") {
    return "border-amber-300/45 bg-amber-50/60 dark:border-amber-400/30 dark:bg-amber-900/10";
  }
  return "border-dashed border-border/70 bg-card";
}

function titleClassName(variant: AdminStateVariant) {
  if (variant === "error") {
    return "text-red-700 dark:text-red-300";
  }
  if (variant === "warning") {
    return "text-amber-700 dark:text-amber-300";
  }
  return "text-foreground";
}

export function AdminStateBlock({
  action,
  className,
  contentClassName,
  detail,
  text,
  variant = "empty",
}: {
  action?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  detail?: string;
  text: string;
  variant?: AdminStateVariant;
}) {
  return (
    <Card className={cn("shadow-sm", variantClassName(variant), className)}>
      <CardContent className={cn("space-y-3 p-6", contentClassName)}>
        <p className={cn("text-sm font-medium", titleClassName(variant))}>{text}</p>
        {detail ? (
          <p className="text-xs text-muted-foreground">{detail}</p>
        ) : null}
        {action ? <div>{action}</div> : null}
      </CardContent>
    </Card>
  );
}

export function EmptyBlock({ text }: { text: string }) {
  return <AdminStateBlock text={text} />;
}

export function ErrorBlock({
  text,
  detail,
}: {
  text: string;
  detail?: string;
}) {
  return <AdminStateBlock detail={detail} text={text} variant="warning" />;
}

export function RouteStateBlock({
  action,
  detail,
  label,
  title,
  variant = "empty",
}: {
  action?: React.ReactNode;
  detail?: string;
  label?: string;
  title: string;
  variant?: AdminStateVariant;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4">
      <Card className={cn("w-full text-center shadow-sm", variantClassName(variant))}>
        <CardContent className="space-y-4 p-8">
          {label ? (
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {label}
            </p>
          ) : null}
          <div className="space-y-2">
            <h1 className={cn("text-xl font-semibold tracking-tight", titleClassName(variant))}>
              {title}
            </h1>
            {detail ? (
              <p className="text-sm text-muted-foreground">{detail}</p>
            ) : null}
          </div>
          {action ? <div>{action}</div> : null}
        </CardContent>
      </Card>
    </main>
  );
}
