import Link from "next/link";
import { BottomActionBar } from "@/components/site/bottom-action-bar";
import { BrandLogoLockup } from "@/components/brand/brand-logo";
import { PageSection, PageShell, PageTitle } from "@/components/site/page-shell";
import { buttonVariants } from "@/components/ui/button";
import {
  SurfaceCard,
} from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { readSession } from "@/lib/server/session";
import { ActionRowLink, DetailRow } from "@/components/site/action-row";

export default async function HomePage() {
  const { messages } = await getServerI18n();
  const session = await readSession({ redirectTo: "/" });

  if (!session) {
    return (
      <PageShell className="space-y-6 pt-8" withBottomInset>
        <div className="space-y-5">
          <div className="space-y-4">
            <BrandLogoLockup subtitle={messages.home.badge} />
            <PageTitle
              title={messages.home.title}
              description={messages.home.description}
            />
          </div>

          <SurfaceCard className="overflow-hidden">
            <div className="space-y-3 px-4 py-5">
              <p className="text-sm font-medium text-foreground">
                {messages.home.signedOut}
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                {messages.home.signedOutHint}
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

  return (
    <PageShell className="space-y-6 pt-6" withBottomInset>
      <PageTitle
        title={`${session.displayName}，你好`}
        description={messages.home.description}
      />

      <PageSection title={messages.home.accountSummary}>
        <SurfaceCard className="overflow-hidden">
          <dl className="divide-y divide-border/70">
            <DetailRow
              label={messages.common.labels.sessionStatus}
              value={messages.home.signedIn}
            />
            <DetailRow label={messages.common.labels.email} value={session.email} />
            <DetailRow
              label={messages.common.labels.role}
              value={session.roles.join(", ") || "-"}
            />
          </dl>
        </SurfaceCard>
      </PageSection>

      <PageSection title={messages.home.quickActions}>
        <SurfaceCard className="overflow-hidden">
          <div className="divide-y divide-border/70">
            <ActionRowLink
              href="/me"
              title={messages.common.nav.me}
              description={messages.profile.description}
              dataTestId="home-me-link"
              icon={
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 12a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" />
                  <path d="M5 19.25a7.25 7.25 0 0 1 14 0" />
                </svg>
              }
            />
            <ActionRowLink
              href="/account"
              title={messages.security.title}
              description={messages.security.description}
              icon={
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3 6.5 5v5.2c0 4.05 2.3 7.8 5.5 9.3 3.2-1.5 5.5-5.25 5.5-9.3V5L12 3Z" />
                  <path d="m9.75 12 1.5 1.5 3-3.25" />
                </svg>
              }
            />
          </div>
        </SurfaceCard>
      </PageSection>
    </PageShell>
  );
}
