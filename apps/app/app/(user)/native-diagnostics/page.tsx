import { NativeUpdatePanel } from "@/components/account/native-update-panel";
import { NativeCapabilitiesPanel } from "@/components/native-diagnostics/native-capabilities-panel";
import { PageSection, PageShell } from "@/components/site/page-shell";
import { getServerI18n } from "@/lib/i18n/server";
import { requireSession } from "@/lib/server/session";

export default async function NativeDiagnosticsPage() {
  const { messages } = await getServerI18n();
  await requireSession("/native-diagnostics");

  return (
    <PageShell className="space-y-6 pt-5">
      <PageSection
        title={messages.nativeCapabilities.title}
        description={messages.nativeCapabilities.description}
      >
        <NativeCapabilitiesPanel messages={messages.nativeCapabilities} />
      </PageSection>

      <NativeUpdatePanel messages={messages.nativeUpdate} />
    </PageShell>
  );
}
