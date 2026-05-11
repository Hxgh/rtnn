import { InAppWebViewPanel } from "@/components/device-services/in-app-webview-panel";
import { PageShell } from "@/components/site/page-shell";
import { getServerI18n } from "@/lib/i18n/server";
import { requireSession } from "@/lib/server/session";

type WebViewPageSearchParams = Promise<{ url?: string }>;

export default async function DeviceServicesWebViewPage({
  searchParams,
}: {
  searchParams?: WebViewPageSearchParams;
}) {
  const { messages } = await getServerI18n();
  await requireSession("/device-services/webview");
  const params = searchParams ? await searchParams : undefined;

  return (
    <PageShell className="space-y-5 pt-5">
      <InAppWebViewPanel
        initialUrl={params?.url ?? null}
        messages={messages.nativeCapabilities}
      />
    </PageShell>
  );
}
