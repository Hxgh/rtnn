import { formatClientPackageName, formatClientTarget } from "@rtnn/config";
import { AdminStatusBadge } from "@/src/components/admin/status-badge";
import { AdminEmptyValue } from "@/src/components/admin/table-display";
import { Badge } from "@/src/components/ui/badge";
import { formatFileSize, shortHash } from "@/src/lib/admin-format";
import { formatClientReleaseChannel } from "@/src/lib/client-release-display";
import { formatAdminDateTime } from "@/src/lib/utils";
import type {
  ClientDownloadRow,
  ClientReleaseRow,
  ClientReleasesDictionary,
  DiagnosticTone,
  ReleaseStatusSummary,
} from "./types";
import type { RuntimeVersionInfo } from "@/src/lib/api-client";

export function ReleaseOverview({
  dictionary,
  locale,
  runtime,
  releaseStatus,
  testingDownloads,
  productionDownloads,
  releases,
}: {
  dictionary: ClientReleasesDictionary;
  locale: string;
  runtime: RuntimeVersionInfo | null;
  releaseStatus: ReleaseStatusSummary | null;
  testingDownloads: ClientDownloadRow[];
  productionDownloads: ClientDownloadRow[];
  releases: ClientReleaseRow[];
}) {
  const labels = dictionary.clientReleases;
  const diagnostics = buildReleaseDiagnostics({
    dictionary,
    locale,
    runtime,
    releaseStatus,
    testingDownloads,
    productionDownloads,
    releases,
  });

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(240px,0.8fr)_minmax(520px,1.6fr)] 2xl:grid-cols-[minmax(240px,0.75fr)_minmax(560px,1.45fr)_minmax(300px,0.9fr)]">
      <section className="min-w-0 rounded-xl border border-border/70 bg-card p-4 shadow-sm lg:col-span-2 2xl:col-span-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            {labels.runtimeTitle}
          </h2>
          <AdminStatusBadge tone={runtime ? "success" : "warning"}>
            {runtime
              ? labels.runtimeEnvironment
              : dictionary.states.apiUnavailable}
          </AdminStatusBadge>
        </div>
        <dl className="mt-4 grid gap-3 text-sm">
          <ReleaseOverviewItem
            label={labels.runtimeVersion}
            value={runtime?.version}
          />
          <ReleaseOverviewItem
            label={labels.runtimeEnvironment}
            value={runtime?.environment}
          />
          <ReleaseOverviewItem
            label={labels.runtimeSource}
            value={
              runtime?.sourceSha ? shortHash(runtime.sourceSha) : undefined
            }
            mono
          />
          <ReleaseOverviewItem
            label={labels.runtimeCheckedAt}
            value={
              runtime?.timestamp
                ? formatAdminDateTime(locale, runtime.timestamp)
                : undefined
            }
          />
        </dl>
      </section>

      <section className="min-w-0 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            {labels.currentDownloads}
          </h2>
          <Badge variant="outline">
            {testingDownloads.length + productionDownloads.length}{" "}
            {labels.availableDownloads}
          </Badge>
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <DownloadOverviewGroup
            locale={locale}
            title={labels.testingDownloads}
            downloads={testingDownloads}
            emptyText={labels.unavailableDownloads}
          />
          <DownloadOverviewGroup
            locale={locale}
            title={labels.productionDownloads}
            downloads={productionDownloads}
            emptyText={labels.unavailableDownloads}
          />
        </div>
      </section>

      <section className="min-w-0 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            {labels.diagnosticsTitle}
          </h2>
          <AdminStatusBadge tone={diagnostics.tone}>
            {diagnostics.status}
          </AdminStatusBadge>
        </div>
        <div className="mt-4 space-y-3">
          {diagnostics.items.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    {item.label}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">
                    {item.detail}
                  </div>
                </div>
                <AdminStatusBadge tone={item.tone}>
                  {item.status}
                </AdminStatusBadge>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function buildReleaseDiagnostics({
  dictionary,
  locale,
  runtime,
  releaseStatus,
  testingDownloads,
  productionDownloads,
  releases,
}: {
  dictionary: ClientReleasesDictionary;
  locale: string;
  runtime: RuntimeVersionInfo | null;
  releaseStatus: ReleaseStatusSummary | null;
  testingDownloads: ClientDownloadRow[];
  productionDownloads: ClientDownloadRow[];
  releases: ClientReleaseRow[];
}) {
  const labels = dictionary.clientReleases;
  const normalizedRuntimeSha = runtime?.sourceSha?.trim();
  const matchedRelease = normalizedRuntimeSha
    ? releases.find((item) => item.sourceSha === normalizedRuntimeSha)
    : undefined;
  const latestRelease = releases[0];
  const runtimeKnown = Boolean(
    runtime?.version &&
    normalizedRuntimeSha &&
    normalizedRuntimeSha !== "unknown",
  );
  const diagnostics: Array<{
    label: string;
    detail: string;
    status: string;
    tone: DiagnosticTone;
  }> = [
    {
      label: labels.diagnosticReleaseStatus,
      detail: releaseStatus
        ? formatReleaseStatusDetail(labels, releaseStatus)
        : labels.diagnosticReleaseStatusUnavailable,
      status: releaseStatus
        ? formatReleaseStatusLabel(labels, releaseStatus.status)
        : labels.diagnosticInformational,
      tone: releaseStatus
        ? resolveReleaseStatusTone(releaseStatus.status)
        : "neutral",
    },
    {
      label: labels.diagnosticRuntime,
      detail: runtimeKnown
        ? `${runtime?.version ?? "-"} · ${shortHash(normalizedRuntimeSha)}`
        : labels.diagnosticRuntimeUnavailable,
      status: runtimeKnown
        ? labels.diagnosticPassed
        : labels.diagnosticNeedsAttention,
      tone: runtimeKnown ? "success" : "warning",
    },
    {
      label: labels.diagnosticSourceMatch,
      detail: matchedRelease
        ? `${matchedRelease.releaseVersion} · ${formatClientReleaseChannel(
            matchedRelease.channel,
            locale,
          )}`
        : latestRelease
          ? labels.diagnosticSourceMismatch
          : labels.diagnosticNoReleaseRecords,
      status: matchedRelease
        ? labels.diagnosticPassed
        : labels.diagnosticNeedsAttention,
      tone: matchedRelease ? "success" : "warning",
    },
    {
      label: labels.diagnosticTestingDownloads,
      detail:
        testingDownloads.length > 0
          ? `${testingDownloads.length} ${labels.availableDownloads}`
          : labels.unavailableDownloads,
      status:
        testingDownloads.length > 0
          ? labels.diagnosticPassed
          : labels.diagnosticNeedsAttention,
      tone: testingDownloads.length > 0 ? "success" : "warning",
    },
    {
      label: labels.diagnosticProductionDownloads,
      detail:
        productionDownloads.length > 0
          ? `${productionDownloads.length} ${labels.availableDownloads}`
          : labels.unavailableDownloads,
      status:
        productionDownloads.length > 0
          ? labels.diagnosticPassed
          : labels.diagnosticInformational,
      tone: productionDownloads.length > 0 ? "success" : "neutral",
    },
  ];
  const hasWarning = diagnostics.some(
    (item) => item.tone === "warning" || item.tone === "danger",
  );

  return {
    items: diagnostics,
    status: hasWarning
      ? labels.diagnosticNeedsAttention
      : labels.diagnosticPassed,
    tone: hasWarning ? ("warning" as const) : ("success" as const),
  };
}

function formatReleaseStatusLabel(
  labels: ClientReleasesDictionary["clientReleases"],
  status: ReleaseStatusSummary["status"],
) {
  switch (status) {
    case "fresh":
      return labels.releaseStatusFresh;
    case "stale":
      return labels.releaseStatusStale;
    case "blocked":
      return labels.releaseStatusBlocked;
    case "skipped":
      return labels.releaseStatusSkipped;
    default:
      return labels.releaseStatusUnknown;
  }
}

function formatReleaseStatusDetail(
  labels: ClientReleasesDictionary["clientReleases"],
  releaseStatus: ReleaseStatusSummary,
) {
  if (releaseStatus.findingCount === 0) {
    return releaseStatus.code;
  }

  return `${releaseStatus.code} · ${releaseStatus.errorCount} ${labels.releaseStatusErrors} · ${releaseStatus.warningCount} ${labels.releaseStatusWarnings}`;
}

function resolveReleaseStatusTone(
  status: ReleaseStatusSummary["status"],
): DiagnosticTone {
  switch (status) {
    case "fresh":
      return "success";
    case "stale":
    case "blocked":
      return "danger";
    case "skipped":
    case "unknown":
      return "neutral";
  }
}

function ReleaseOverviewItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          mono
            ? "font-mono text-xs text-foreground"
            : "text-right text-foreground"
        }
      >
        {value || <AdminEmptyValue />}
      </dd>
    </div>
  );
}

function DownloadOverviewGroup({
  locale,
  title,
  downloads,
  emptyText,
}: {
  locale: string;
  title: string;
  downloads: ClientDownloadRow[];
  emptyText: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border/70 bg-muted/10 p-3">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
        <h3 className="min-w-0 text-sm font-medium text-foreground">{title}</h3>
        <Badge variant="secondary">{downloads.length}</Badge>
      </div>
      {downloads.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {downloads.slice(0, 4).map((item) => (
            <div
              key={`${item.channel}-${item.client}-${item.target}`}
              className="rounded-md border border-border/60 bg-background px-3 py-2"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="break-words text-sm font-medium leading-5 text-foreground">
                    {formatClientPackageName(item.client, item.target, locale)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.version ?? item.shellVersion ?? "-"} ·{" "}
                    {formatFileSize(item.fileSize)}
                  </div>
                </div>
                <div className="shrink-0">
                  <AdminStatusBadge tone="success">
                    {formatClientTarget(item.target)}
                  </AdminStatusBadge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
