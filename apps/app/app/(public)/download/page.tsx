import type { ClientDownloadInfo } from "@rtnn/shared-types";
import {
  formatClientPackageName,
  formatClientRole,
  formatClientTarget,
} from "@rtnn/config";
import { NativeDownloadButton } from "@/components/download/native-download-button";
import { PageSection, PageShell } from "@/components/site/page-shell";
import { SurfaceCard } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { listClientDownloads } from "@/lib/server/api-client";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type DownloadPageSearchParams = Promise<{ channel?: string }>;

function resolveDefaultChannel() {
  return process.env.DEPLOY_ENVIRONMENT === "testing" ? "testing" : "production";
}

async function resolveDownloads(channel: string): Promise<ClientDownloadInfo[]> {
  try {
    return await listClientDownloads({ channel });
  } catch {
    return [];
  }
}

function formatSize(value?: number | null) {
  if (!value) {
    return "-";
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function shortHash(value?: string | null) {
  return value ? value.slice(0, 12) : "-";
}

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function DownloadPage({
  searchParams,
}: {
  searchParams?: DownloadPageSearchParams;
}) {
  const { locale, messages } = await getServerI18n();
  const params = searchParams ? await searchParams : undefined;
  const defaultChannel = resolveDefaultChannel();
  const channel = String(params?.channel ?? defaultChannel).trim() || defaultChannel;
  const downloads = await resolveDownloads(channel);

  return (
    <PageShell className="space-y-5 pt-5">
      <p className="max-w-[24rem] text-sm leading-6 text-muted-foreground">
        {messages.download.description}
      </p>

      <PageSection title={messages.download.sectionTitle}>
        <div className="space-y-3">
          {downloads.length === 0 ? (
            <SurfaceCard className="px-4 py-4">
              <p className="text-sm text-muted-foreground">
                {messages.download.unavailable}
              </p>
            </SurfaceCard>
          ) : null}
          {downloads.map((info) => {
            const available = Boolean(info.downloadUrl);
            return (
              <SurfaceCard className="overflow-hidden" key={`${info.client}-${info.target}`}>
                <div className="space-y-4 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">
                        {formatClientPackageName(info.client, info.target, locale)}
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatClientRole(info.client, locale)} / {formatClientTarget(info.target)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs",
                        available
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {available ? messages.download.available : messages.download.notAvailable}
                    </span>
                  </div>
                  <dl className="grid gap-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{messages.download.version}</dt>
                      <dd className="text-right">{info.version ?? info.shellVersion ?? "-"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{messages.download.channel}</dt>
                      <dd className="text-right">{info.channel}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{messages.download.provider}</dt>
                      <dd className="text-right">{info.provider ?? "-"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{messages.download.file}</dt>
                      <dd className="max-w-[12rem] truncate text-right">{info.fileName ?? "-"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{messages.download.fileSize}</dt>
                      <dd className="text-right">{formatSize(info.fileSize)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{messages.download.updatedAt}</dt>
                      <dd className="text-right">
                        {formatDateTime(info.syncedAt ?? info.generatedAt, locale)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{messages.download.sha256}</dt>
                      <dd className="font-mono text-xs">{shortHash(info.sha256)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{messages.download.reason}</dt>
                      <dd className="text-right">{info.reason ?? "-"}</dd>
                    </div>
                  </dl>
                  {available ? (
                    <NativeDownloadButton
                      failedLabel={messages.download.openFailed}
                      label={messages.download.download}
                      url={info.downloadUrl ?? "#"}
                    />
                  ) : null}
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      </PageSection>
    </PageShell>
  );
}
