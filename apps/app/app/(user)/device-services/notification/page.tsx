import { NotificationPanel } from "@/components/device-services/notification-panel";
import { PageShell } from "@/components/site/page-shell";
import { getServerI18n } from "@/lib/i18n/server";
import { requireSession } from "@/lib/server/session";

export default async function DeviceServicesNotificationPage() {
  const { messages } = await getServerI18n();
  await requireSession("/device-services/notification");

  return (
    <PageShell className="space-y-5 pt-5">
      <NotificationPanel messages={messages.nativeCapabilities} />
    </PageShell>
  );
}
