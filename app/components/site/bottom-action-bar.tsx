import { cn } from "@/lib/utils";

export function BottomActionBar(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-background/98 backdrop-blur">
      <div
        className={cn(
          "mx-auto w-full max-w-[28rem] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
          props.className,
        )}
      >
        {props.children}
      </div>
    </div>
  );
}
