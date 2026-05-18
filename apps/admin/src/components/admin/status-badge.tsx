import { Badge } from "@/src/components/ui/badge";
import { cn } from "@/src/lib/utils";

export function AdminStatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "success" | "warning" | "danger" | "neutral";
}) {
  return (
    <Badge className={cn("border", statusToneClassName(tone))} variant="outline">
      {children}
    </Badge>
  );
}

export function statusToneClassName(tone: "success" | "warning" | "danger" | "neutral") {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-900/20 dark:text-emerald-300";
    case "danger":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-900/20 dark:text-red-300";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-900/20 dark:text-amber-300";
    case "neutral":
      return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-400/30 dark:bg-slate-900/20 dark:text-slate-300";
  }
}
