import { BarcodeScannerPanel } from "@/components/device-services/barcode-scanner-panel";
import { PageShell } from "@/components/site/page-shell";
import { getServerI18n } from "@/lib/i18n/server";
import { requireSession } from "@/lib/server/session";

export default async function DeviceServicesScanPage() {
  const { messages } = await getServerI18n();
  await requireSession("/device-services/scan");

  return (
    <PageShell className="space-y-5 pt-5">
      <BarcodeScannerPanel messages={messages.nativeCapabilities} />
    </PageShell>
  );
}
