import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  CardContent,
  SurfaceCard,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatePanel(props: {
  code: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionType?: "link" | "button";
  onAction?: () => void;
  danger?: boolean;
}) {
  const { actionType = "link" } = props;
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="space-y-2 px-4 py-4">
        <p
          className={cn(
            "text-xs uppercase tracking-[0.2em] text-muted-foreground",
            props.danger && "text-destructive",
          )}
        >
          {props.code}
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{props.title}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{props.description}</p>
      </div>
      {props.actionLabel ? (
        <CardContent className="border-t border-border/70 pt-4">
          {actionType === "button" ? (
            <button
              type="button"
              onClick={props.onAction}
              className={buttonVariants({ className: "w-full" })}
            >
              {props.actionLabel}
            </button>
          ) : (
            <Link
              href={props.actionHref ?? "/"}
              className={buttonVariants({ className: "w-full" })}
            >
              {props.actionLabel}
            </Link>
          )}
        </CardContent>
      ) : null}
    </SurfaceCard>
  );
}
