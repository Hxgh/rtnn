import { PageSection, PageShell, PageTitle } from "@/components/site/page-shell";
import {
  CardContent,
  SurfaceCard,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getServerI18n } from "@/lib/i18n/server";

export default async function GlobalLoading() {
  const { messages } = await getServerI18n();

  return (
    <PageShell className="space-y-4 pt-8">
      <PageTitle title={messages.loading.title} />
      <PageSection>
        <SurfaceCard>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </SurfaceCard>
      </PageSection>
    </PageShell>
  );
}
