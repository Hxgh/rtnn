import { cn } from "@/lib/utils";

export function BottomActionBar(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
      <div className="mx-auto w-full max-w-[28rem] bg-background">
        <div
          className={cn(
            "rtnn-native-bottom-surface pointer-events-auto border-t border-border/80 px-4 pt-3 pb-[var(--rtnn-bottom-nav-spacing)]",
            props.className,
          )}
        >
          {props.children}
        </div>
      </div>
    </div>
  );
}
