import { PageShell } from "@/components/site/page-shell";
import { StatePanel } from "@/components/site/state-panel";
import { getServerI18n } from "@/lib/i18n/server";

export default async function ForbiddenPage() {
  const { messages } = await getServerI18n();
  return (
    <PageShell className="pt-8">
      <StatePanel
        code={messages.forbidden.code}
        title={messages.forbidden.title}
        description={messages.forbidden.description}
        actionLabel={messages.common.actions.backHome}
        actionHref="/"
        danger
      />
    </PageShell>
  );
}
