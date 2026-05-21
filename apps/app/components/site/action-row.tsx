import Link from "next/link";
import { cn } from "@/lib/utils";

export function ActionRowLink(props: {
  href: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  prefetch?: boolean;
  className?: string;
  dataTestId?: string;
}) {
  return (
    <Link
      href={props.href}
      prefetch={props.prefetch}
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-secondary/55",
        props.className,
      )}
      data-testid={props.dataTestId}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {props.icon ? (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground">
            {props.icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{props.title}</p>
          {props.description ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {props.description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {props.trailing}
        <span>›</span>
      </div>
    </Link>
  );
}

export function DetailRow(props: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1 px-4 py-4", props.className)}>
      <dt className="text-xs font-medium text-muted-foreground">{props.label}</dt>
      <dd
        className={cn(
          "min-w-0 break-words text-sm text-foreground",
          props.mono && "break-all font-mono text-xs text-muted-foreground",
        )}
      >
        {props.value}
      </dd>
    </div>
  );
}
