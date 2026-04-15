import { cn } from "@/lib/utils";

export function Skeleton(props: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", props.className)} />;
}
