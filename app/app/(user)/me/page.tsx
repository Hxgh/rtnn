import { LocaleSwitcher } from "@/components/preferences/locale-switcher";
import { ThemeToggle } from "@/components/preferences/theme-toggle";
import { ActionRowLink, DetailRow } from "@/components/site/action-row";
import { PageSection, PageShell, PageTitle } from "@/components/site/page-shell";
import { buttonVariants } from "@/components/ui/button";
import {
  SurfaceCard,
} from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { requireSession } from "@/lib/server/session";

export default async function MePage() {
  const { messages } = await getServerI18n();
  const session = await requireSession("/me");
  const initials = session.displayName.trim().slice(0, 1).toUpperCase();

  return (
    <PageShell className="space-y-6 pt-6" withBottomInset>
      <PageTitle
        title={messages.common.nav.me}
        description={messages.profile.description}
      />

      <SurfaceCard className="overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary text-lg font-semibold text-foreground">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">{session.displayName}</p>
            <p className="mt-1 truncate text-sm text-muted-foreground">{session.email}</p>
          </div>
        </div>
      </SurfaceCard>

      <PageSection title={messages.profile.accountOverview}>
        <SurfaceCard className="overflow-hidden">
          <dl className="divide-y divide-border/70">
            <DetailRow label={messages.profile.currentUser} value={session.displayName} />
            <DetailRow label={messages.common.labels.email} value={session.email} />
            <DetailRow
              label={messages.common.labels.role}
              value={session.roles.join(", ") || "-"}
            />
            <DetailRow
              label={messages.common.labels.userId}
              value={session.id}
              mono
            />
          </dl>
        </SurfaceCard>
      </PageSection>

      <PageSection title={messages.home.quickActions}>
        <SurfaceCard className="overflow-hidden">
          <ActionRowLink
            href="/account"
            title={messages.security.title}
            description={messages.security.description}
            dataTestId="me-account-link"
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
        </SurfaceCard>
      </PageSection>

      <PageSection title={messages.profile.preferencesTitle}>
        <SurfaceCard className="overflow-hidden">
          <div className="divide-y divide-border/70">
            <div className="px-4 py-4">
              <LocaleSwitcher />
            </div>
            <div className="px-4 py-4">
              <ThemeToggle />
            </div>
          </div>
        </SurfaceCard>
      </PageSection>

      <PageSection title={messages.home.sessionTitle}>
        <SurfaceCard className="px-4 py-4">
          <div className="grid gap-3">
            <form action="/api/session/logout" method="post">
              <button
                type="submit"
                className={buttonVariants({ variant: "destructive", className: "w-full" })}
              >
                {messages.profile.signOut}
              </button>
            </form>
          </div>
        </SurfaceCard>
      </PageSection>
    </PageShell>
  );
}
