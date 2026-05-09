import { AppChrome } from "@/components/site/app-chrome";
import { PageShell } from "@/components/site/page-shell";
import {
  CardContent,
  SurfaceCard,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function GlobalLoading() {
  return (
    <AppChrome showTabBar={false}>
      <PageShell className="space-y-4 pt-5">
        <SurfaceCard>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </SurfaceCard>
      </PageShell>
    </AppChrome>
  );
}
