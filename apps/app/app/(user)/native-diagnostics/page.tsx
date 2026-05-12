import { NativeDiagnosticsPanel } from "@/components/device-services/native-diagnostics-panel";
import { PageShell } from "@/components/site/page-shell";
import { getServerI18n } from "@/lib/i18n/server";
import { requireSession } from "@/lib/server/session";

export default async function NativeDiagnosticsPage() {
  const { messages } = await getServerI18n();
  await requireSession("/native-diagnostics");

  return (
    <PageShell className="space-y-5 pt-4">
      <NativeDiagnosticsPanel messages={messages.nativeCapabilities} />
    </PageShell>
  );
}
