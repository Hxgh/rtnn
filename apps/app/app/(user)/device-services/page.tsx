import { DeviceServicesPanel } from "@/components/device-services/device-services-panel";
import { PageShell } from "@/components/site/page-shell";
import { getServerI18n } from "@/lib/i18n/server";
import { requireSession } from "@/lib/server/session";

export default async function DeviceServicesPage() {
  const { messages } = await getServerI18n();
  await requireSession("/device-services");

  return (
    <PageShell className="space-y-5 pt-4">
      <DeviceServicesPanel messages={messages.nativeCapabilities} />
    </PageShell>
  );
}
