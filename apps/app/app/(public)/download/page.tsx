import Link from "next/link";
import type { ClientDownloadInfo } from "@rtnn/shared-types";
import { PageSection, PageShell, PageTitle } from "@/components/site/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { getLatestClientDownload } from "@/lib/server/api-client";
import { cn } from "@/lib/utils";

const downloadTargets = [
  { client: "appMobile", target: "android", label: "Android" },
  { client: "adminDesktop", target: "windows", label: "Windows" },
  { client: "adminDesktop", target: "macos", label: "macOS" },
  { client: "appMobile", target: "ios", label: "iOS" },
] as const;

type DownloadPageSearchParams = Promise<{ channel?: string }>;
type DownloadTarget = (typeof downloadTargets)[number];

type DownloadResult = DownloadTarget & {
  info: ClientDownloadInfo;
};

function unavailableInfo(target: DownloadTarget, channel: string, reason: string): ClientDownloadInfo {
  return {
    client: target.client,
    target: target.target,
    channel,
    downloadType: "unavailable",
    updateAvailable: false,
    forceUpdate: false,
    reason,
  };
}

async function resolveDownloads(channel: string) {
  return Promise.all(
    downloadTargets.map(async (target) => {
      try {
        const info = await getLatestClientDownload({
          client: target.client,
          target: target.target,
          channel,
        });
        return { ...target, info: info as ClientDownloadInfo };
      } catch {
        return {
          ...target,
          info: unavailableInfo(target, channel, "api-unavailable"),
        };
      }
    }),
  ) satisfies Promise<DownloadResult[]>;
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

export default async function DownloadPage({
  searchParams,
}: {
  searchParams?: DownloadPageSearchParams;
}) {
  const { messages } = await getServerI18n();
  const params = searchParams ? await searchParams : undefined;
  const channel = String(params?.channel ?? "production").trim() || "production";
  const downloads = await resolveDownloads(channel);

  return (
    <PageShell className="space-y-6 pt-8">
      <PageTitle
        title={messages.download.title}
        description={messages.download.description}
      />

      <PageSection title={messages.download.sectionTitle}>
        <div className="space-y-3">
          {downloads.map(({ client, target, label, info }) => {
            const available = Boolean(info.downloadUrl);
            return (
              <SurfaceCard className="overflow-hidden" key={`${client}-${target}`}>
                <div className="space-y-4 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">{label}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {client} / {target}
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
                      <dt className="text-muted-foreground">{messages.download.sha256}</dt>
                      <dd className="font-mono text-xs">{shortHash(info.sha256)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{messages.download.reason}</dt>
                      <dd className="text-right">{info.reason ?? "-"}</dd>
                    </div>
                  </dl>
                  {available ? (
                    <Link
                      className={buttonVariants({ className: "w-full" })}
                      href={info.downloadUrl ?? "#"}
                    >
                      {messages.download.download}
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className={buttonVariants({
                        className: "pointer-events-none w-full opacity-50",
                        variant: "outline",
                      })}
                    >
                      {messages.download.unavailable}
                    </span>
                  )}
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      </PageSection>
    </PageShell>
  );
}
