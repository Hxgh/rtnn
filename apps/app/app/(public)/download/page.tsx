import Link from "next/link";
import type { ClientDownloadInfo } from "@rtnn/shared-types";
import { PageSection, PageShell, PageTitle } from "@/components/site/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { getLatestClientDownload } from "@/lib/server/api-client";

const downloadTargets = [
  { client: "appMobile", target: "android", label: "Android" },
  { client: "adminDesktop", target: "windows", label: "Windows" },
  { client: "adminDesktop", target: "macos", label: "macOS" },
  { client: "appMobile", target: "ios", label: "iOS" },
] as const;

type DownloadPageSearchParams = Promise<{ channel?: string }>;

async function resolveDownloads(channel: string) {
  const results = await Promise.all(
    downloadTargets.map(async (target) => {
      try {
        const info = await getLatestClientDownload({
          client: target.client,
          target: target.target,
          channel,
        });
        return { ...target, info };
      } catch {
        return {
          ...target,
          info: null,
        };
      }
    }),
  );

  return results.filter(
    (item): item is typeof item & { info: ClientDownloadInfo } =>
      Boolean(item.info?.downloadUrl),
  );
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
        {downloads.length > 0 ? (
          <div className="space-y-3">
            {downloads.map(({ client, target, label, info }) => (
              <SurfaceCard className="overflow-hidden" key={`${client}-${target}`}>
                <div className="space-y-4 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">{label}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {client} / {target}
                      </p>
                    </div>
                    <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                      {channel}
                    </span>
                  </div>
                  <dl className="grid gap-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{messages.download.version}</dt>
                      <dd>{info.version ?? info.shellVersion ?? "-"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{messages.download.provider}</dt>
                      <dd>{info.provider ?? "-"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">{messages.download.fileSize}</dt>
                      <dd>{formatSize(info.fileSize)}</dd>
                    </div>
                  </dl>
                  <Link
                    className={buttonVariants({ className: "w-full" })}
                    href={info.downloadUrl ?? "#"}
                  >
                    {messages.download.download}
                  </Link>
                </div>
              </SurfaceCard>
            ))}
          </div>
        ) : (
          <SurfaceCard className="px-4 py-5 text-sm text-muted-foreground">
            {messages.download.unavailable}
          </SurfaceCard>
        )}
      </PageSection>
    </PageShell>
  );
}
