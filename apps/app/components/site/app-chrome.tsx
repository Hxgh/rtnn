import { BottomTabBar } from "@/components/site/bottom-tab-bar";
import { SiteHeader } from "@/components/site/site-header";
import { cn } from "@/lib/utils";

export function AppChrome({
  children,
  className,
  showHeader = true,
  showTabBar = true,
}: {
  children: React.ReactNode;
  className?: string;
  showHeader?: boolean;
  showTabBar?: boolean;
}) {
  return (
    <div
      className={cn(
        "rtnn-app-viewport relative isolate mx-auto flex w-full max-w-[28rem] flex-col bg-background",
        className,
      )}
    >
      {showHeader ? <SiteHeader /> : null}
      <div className="rtnn-app-scroll min-h-0 flex-1">{children}</div>
      <BottomTabBar enabled={showTabBar} />
    </div>
  );
}
