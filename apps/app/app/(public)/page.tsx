import { redirect } from "next/navigation";
import Link from "next/link";
import { BottomActionBar } from "@/components/site/bottom-action-bar";
import { BrandLogoLockup } from "@/components/brand/brand-logo";
import { PageShell, PageTitle } from "@/components/site/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { readSession } from "@/lib/server/session";

export default async function PublicHomePage() {
  const { messages } = await getServerI18n();
  const session = await readSession({ redirectTo: "/home" });

  if (session) {
    redirect("/home");
  }

  return (
    <PageShell className="space-y-6 pt-8" withBottomInset>
      <div className="space-y-5">
        <div className="space-y-4">
          <BrandLogoLockup subtitle={messages.home.badge} />
          <PageTitle
            title={messages.home.title}
            description={messages.home.signedOutHint}
          />
        </div>

        <SurfaceCard className="overflow-hidden">
          <div className="space-y-3 px-4 py-5">
            <p className="text-sm font-medium text-foreground">
              {messages.home.signedOut}
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              {messages.login.description}
            </p>
          </div>
        </SurfaceCard>
      </div>

      <BottomActionBar>
        <Link href="/login" className={buttonVariants({ className: "w-full" })}>
          {messages.common.nav.login}
        </Link>
      </BottomActionBar>
    </PageShell>
  );
}
