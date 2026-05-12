import { MapNavigationPanel } from "@/components/device-services/map-navigation-panel";
import { PageShell } from "@/components/site/page-shell";
import { getServerI18n } from "@/lib/i18n/server";
import { requireSession } from "@/lib/server/session";

export default async function DeviceServicesMapPage() {
  const { messages } = await getServerI18n();
  await requireSession("/device-services/map");

  return (
    <PageShell className="space-y-5 pt-5">
      <MapNavigationPanel messages={messages.nativeCapabilities} />
    </PageShell>
  );
}
