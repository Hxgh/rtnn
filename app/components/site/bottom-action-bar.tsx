import { cn } from "@/lib/utils";

export function BottomActionBar(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
      <div className="mx-auto w-full max-w-[28rem] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div
          className={cn(
            "pointer-events-auto rounded-[1.4rem] border border-border/80 bg-background/95 p-3 shadow-[0_-14px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur",
            props.className,
          )}
        >
          {props.children}
        </div>
      </div>
    </div>
  );
}
