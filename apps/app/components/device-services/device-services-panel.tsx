import type { AppMessages } from "@/lib/i18n";
import { ActionRowLink } from "@/components/site/action-row";
import { PageSection } from "@/components/site/page-shell";
import { SurfaceCard } from "@/components/ui/card";
import { DeviceFeatureIcon } from "./device-feature-icon";

type Messages = AppMessages["nativeCapabilities"];

export function DeviceServicesPanel({ messages }: { messages: Messages }) {
  return (
    <div className="space-y-5">
      <PageSection title={messages.serviceActionsTitle}>
        <SurfaceCard className="overflow-hidden">
          <div className="divide-y divide-border/70">
            <ActionRowLink
              description={messages.barcodeDescription}
              href="/device-services/scan"
              icon={<DeviceFeatureIcon kind="scan" label={messages.barcodeTitle} />}
              title={messages.barcodeTitle}
            />
            <ActionRowLink
              description={messages.mapDescription}
              href="/device-services/map"
              icon={<DeviceFeatureIcon kind="map" label={messages.mapTitle} />}
              title={messages.mapTitle}
            />
            <ActionRowLink
              description={messages.mediaDescription}
              href="/device-services/media"
              icon={<DeviceFeatureIcon kind="media" label={messages.mediaTitle} />}
              title={messages.mediaTitle}
            />
            <ActionRowLink
              description={messages.notificationDescription}
              href="/device-services/notification"
              icon={<DeviceFeatureIcon kind="notification" label={messages.notificationTitle} />}
              title={messages.notificationTitle}
            />
          </div>
        </SurfaceCard>
      </PageSection>

      <PageSection title={messages.serviceSupportTitle}>
        <SurfaceCard className="overflow-hidden">
          <div className="divide-y divide-border/70">
            <ActionRowLink
              description={messages.downloadEntryDescription}
              href="/download"
              icon={<DeviceFeatureIcon kind="download" label={messages.openDownloads} />}
              title={messages.openDownloads}
            />
            <ActionRowLink
              description={messages.diagnosticsEntryDescription}
              href="/native-diagnostics"
              icon={<DeviceFeatureIcon kind="diagnostics" label={messages.openDiagnostics} />}
              title={messages.openDiagnostics}
            />
          </div>
        </SurfaceCard>
      </PageSection>
    </div>
  );
}
