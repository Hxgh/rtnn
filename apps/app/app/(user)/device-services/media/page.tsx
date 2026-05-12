import { MediaPickerPanel } from "@/components/device-services/media-picker-panel";
import { PageShell } from "@/components/site/page-shell";
import { getServerI18n } from "@/lib/i18n/server";
import { requireSession } from "@/lib/server/session";

export default async function DeviceServicesMediaPage() {
  const { messages } = await getServerI18n();
  await requireSession("/device-services/media");

  return (
    <PageShell className="space-y-5 pt-5">
      <MediaPickerPanel messages={messages.nativeCapabilities} />
    </PageShell>
  );
}
