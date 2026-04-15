"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/src/lib/utils";

export function SelectionCards({
  legend,
  children,
}: {
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="grid gap-2.5">
      <legend className="text-sm font-medium text-foreground">{legend}</legend>
      <div className="grid gap-2 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function SelectionCard({
  name,
  value,
  label,
  description,
  defaultChecked,
  compact = false,
}: {
  name: string;
  value: string;
  label: string;
  description?: string | null;
  defaultChecked?: boolean;
  compact?: boolean;
}) {
  const [checked, setChecked] = useState(Boolean(defaultChecked));

  return (
    <div className="block">
      {checked ? <input name={name} type="hidden" value={value} /> : null}
      <button
        aria-checked={checked}
        className={cn(
          "flex w-full items-start justify-between rounded-xl border border-border/70 bg-card text-left shadow-sm transition-colors outline-none",
          "hover:bg-accent/30 hover:text-accent-foreground",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
          checked && "border-primary bg-primary/[0.06]",
          compact ? "gap-2 p-3" : "gap-3 p-4",
        )}
        role="checkbox"
        type="button"
        onClick={() => {
          setChecked((current) => !current);
        }}
      >
        <div className={cn("min-w-0", compact ? "space-y-0.5" : "space-y-1")}>
          <div className={cn("font-medium text-foreground", compact ? "text-sm" : "text-sm")}>
            {label}
          </div>
          {description ? (
            <div
              className={cn(
                "break-all text-muted-foreground",
                compact ? "text-[11px] leading-4" : "text-xs",
              )}
            >
              {description}
            </div>
          ) : null}
        </div>
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 flex shrink-0 items-center justify-center rounded-md border border-border bg-background transition-colors",
            checked && "border-primary bg-primary text-primary-foreground",
            compact ? "size-4" : "size-5",
          )}
        >
          <Check className={cn(compact ? "size-3" : "size-3")} />
        </span>
      </button>
    </div>
  );
}
