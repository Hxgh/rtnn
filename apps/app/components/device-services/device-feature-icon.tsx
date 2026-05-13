import { cn } from "@/lib/utils";

export type DeviceFeatureIconKind =
  | "scan"
  | "map"
  | "media"
  | "notification"
  | "safeArea"
  | "download"
  | "diagnostics";

export function DeviceFeatureIcon({
  className,
  kind,
  label,
}: {
  className?: string;
  kind: DeviceFeatureIconKind;
  label: string;
}) {
  const symbol =
    kind === "scan" ? (
      <span aria-hidden="true" className="grid size-4 grid-cols-2 grid-rows-2 gap-0.5">
        <span className="rounded-[2px] border border-current" />
        <span className="rounded-[2px] border border-current" />
        <span className="rounded-[2px] border border-current" />
        <span className="rounded-[2px] border border-current" />
      </span>
    ) : kind === "map" ? (
      <span aria-hidden="true" className="relative block size-4 rounded-full border border-current">
        <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
      </span>
    ) : kind === "media" ? (
      <span aria-hidden="true" className="relative block size-4 rounded-[3px] border border-current">
        <span className="absolute left-1 top-1 size-1 rounded-full bg-current" />
        <span className="absolute bottom-1 left-1 right-1 h-1.5 rounded-[2px] border-l border-t border-current" />
      </span>
    ) : kind === "notification" ? (
      <span aria-hidden="true" className="relative block h-4 w-3.5 rounded-t-full border border-current">
        <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-current" />
      </span>
    ) : kind === "safeArea" ? (
      <span aria-hidden="true" className="relative block h-4 w-3 rounded-[3px] border border-current">
        <span className="absolute left-1 right-1 top-1 h-px bg-current" />
        <span className="absolute bottom-1 left-1 right-1 h-px bg-current" />
      </span>
    ) : kind === "download" ? (
      <span aria-hidden="true" className="relative block h-4 w-3 rounded-[2px] border border-current">
        <span className="absolute left-1/2 top-2 h-1.5 w-px -translate-x-1/2 bg-current" />
        <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 border-b border-r border-current" />
      </span>
    ) : (
      <span aria-hidden="true" className="grid size-4 grid-cols-2 gap-1">
        <span className="rounded-full bg-current" />
        <span className="rounded-full bg-current" />
        <span className="rounded-full bg-current" />
        <span className="rounded-full bg-current" />
      </span>
    );

  return (
    <span
      aria-label={label}
      className={cn("flex size-9 shrink-0 items-center justify-center", className)}
      title={label}
    >
      {symbol}
    </span>
  );
}
