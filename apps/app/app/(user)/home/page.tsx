import { ActionRowLink, DetailRow } from "@/components/site/action-row";
import { PageSection, PageShell, PageTitle } from "@/components/site/page-shell";
import { SurfaceCard } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { requireSession } from "@/lib/server/session";

export default async function UserHomePage() {
  const { messages } = await getServerI18n();
  const session = await requireSession("/home");

  return (
    <PageShell className="space-y-6 pt-6" withBottomInset>
      <PageTitle
        title={messages.home.greeting.replace("{name}", session.displayName)}
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
