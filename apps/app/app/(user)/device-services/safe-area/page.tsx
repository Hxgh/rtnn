import { SafeAreaPanel } from "@/components/device-services/safe-area-panel";
import { PageShell } from "@/components/site/page-shell";
import { getServerI18n } from "@/lib/i18n/server";
import { requireSession } from "@/lib/server/session";

export default async function DeviceServicesSafeAreaPage() {
  const { messages } = await getServerI18n();
  await requireSession("/device-services/safe-area");

  return (
    <PageShell className="space-y-5 pt-5">
      <SafeAreaPanel messages={messages.nativeCapabilities} />
    </PageShell>
  );
}
