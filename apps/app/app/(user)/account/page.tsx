import { ChangePasswordForm } from "@/components/account/change-password-form";
import { DetailRow } from "@/components/site/action-row";
import { PageSection, PageShell } from "@/components/site/page-shell";
import { SurfaceCard } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { requireSession } from "@/lib/server/session";

export default async function AccountPage() {
  const { messages } = await getServerI18n();
  const session = await requireSession("/account");

  return (
    <PageShell className="space-y-6 pt-5">
      <PageSection title={messages.profile.accountOverview}>
        <SurfaceCard className="overflow-hidden">
          <dl className="divide-y divide-border/70">
            <DetailRow label={messages.profile.currentUser} value={session.displayName} />
            <DetailRow label={messages.common.labels.email} value={session.email} />
          </dl>
        </SurfaceCard>
      </PageSection>

      <PageSection title={messages.security.formTitle}>
        <SurfaceCard className="px-4 py-4">
          <ChangePasswordForm />
        </SurfaceCard>
      </PageSection>
    </PageShell>
  );
}
