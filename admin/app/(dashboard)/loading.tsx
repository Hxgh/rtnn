import { Skeleton } from "@/src/components/ui/skeleton";
import { getAdminI18n } from "@/src/i18n/server";

export default async function DashboardLoading() {
  const { dictionary } = await getAdminI18n();

  return (
    <section className="space-y-4 rounded-xl border border-border/70 bg-card p-5 shadow-sm">
      <div>
        <p className="text-sm text-muted-foreground">{dictionary.states.loadingDashboard}</p>
      </div>
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-12 w-1/2" />
    </section>
  );
}
