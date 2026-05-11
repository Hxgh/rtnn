import { NativeUpdatePanel } from "@/components/account/native-update-panel";
import { DeviceServicesPanel } from "@/components/device-services/device-services-panel";
import { PageSection, PageShell } from "@/components/site/page-shell";
import { getServerI18n } from "@/lib/i18n/server";
import { requireSession } from "@/lib/server/session";

export default async function DeviceServicesPage() {
  const { messages } = await getServerI18n();
  await requireSession("/device-services");

  return (
    <PageShell className="space-y-6 pt-5">
      <PageSection
        title={messages.nativeCapabilities.title}
      >
        <DeviceServicesPanel messages={messages.nativeCapabilities} />
      </PageSection>

      <NativeUpdatePanel messages={messages.nativeUpdate} />
    </PageShell>
  );
}
