import { PageShell } from "@/components/site/page-shell";
import { AppChrome } from "@/components/site/app-chrome";
import { StatePanel } from "@/components/site/state-panel";
import { getServerI18n } from "@/lib/i18n/server";

export default async function NotFoundPage() {
  const { messages } = await getServerI18n();

  return (
    <AppChrome showTabBar={false}>
      <PageShell className="pt-8">
        <StatePanel
          code={messages.notFound.code}
          title={messages.notFound.title}
          description={messages.notFound.description}
          actionLabel={messages.common.actions.backHome}
          actionHref="/"
        />
      </PageShell>
    </AppChrome>
  );
}
