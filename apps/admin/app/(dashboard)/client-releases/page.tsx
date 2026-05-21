import Link from "next/link";
import { redirect } from "next/navigation";
import {
  formatClientPackageName,
  formatClientRole,
  formatClientTarget,
} from "@rtnn/config";
import { FormSelect } from "@/src/components/admin/form-select";
import { AdminFilterActions, AdminFilterToolbar } from "@/src/components/admin/filter-toolbar";
import { AdminStatusBadge } from "@/src/components/admin/status-badge";
import {
  AdminBadgeList,
  AdminEmptyValue,
  AdminFilterSummary,
} from "@/src/components/admin/table-display";
import {
  AdminTableActionLink,
  AdminTablePagination,
  AdminTablePage,
  AdminTableRowActions,
  type AdminTableColumn,
} from "@/src/components/admin/table-page";
import { ErrorBlock } from "@/src/components/admin/state-block";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { getAdminI18n } from "@/src/i18n/server";
import { adminRoutes } from "@/src/lib/admin-routes";
import { formatFileSize, shortHash } from "@/src/lib/admin-format";
import {
  clientReleaseDistributionStatuses,
  formatClientReleaseChannel,
  getClientReleaseDistributionStatusLabel,
  getClientReleaseDistributionStatusTone,
} from "@/src/lib/client-release-display";
import {
  getRuntimeVersion,
  listClientDownloads,
  listClientReleases,
  type RuntimeVersionInfo,
} from "@/src/lib/api-client";
import { resolveErrorMessage } from "@/src/lib/errors";
import { parsePageSize } from "@/src/lib/pagination";
import { assertPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";
import { formatAdminDateTime, parsePositiveInt } from "@/src/lib/utils";

const defaultPageSize = 20;
const clients = ["adminDesktop", "appMobile"] as const;
const targets = ["android", "ios", "macos", "windows"] as const;

type ClientReleaseRow = Awaited<ReturnType<typeof listClientReleases>>["data"][number];
type ClientDownloadRow = Awaited<ReturnType<typeof listClientDownloads>>[number];
type DiagnosticTone = "success" | "warning" | "danger" | "neutral";
type PageSearchParams = Promise<{
  page?: string;
  pageSize?: string;
  search?: string;
  channel?: string;
  client?: string;
  target?: string;
  distributionStatus?: string;
}>;

function normalizeFilters(params?: Awaited<PageSearchParams>) {
  return {
    search: String(params?.search ?? "").trim(),
    channel: String(params?.channel ?? "").trim(),
    client: String(params?.client ?? "").trim(),
    target: String(params?.target ?? "").trim(),
    distributionStatus: String(params?.distributionStatus ?? "").trim(),
  };
}

function buildHref(page: number, pageSize: number, filters: ReturnType<typeof normalizeFilters>) {
  const params = new URLSearchParams();
  if (page > 1) {
    params.set("page", String(page));
  }
  if (pageSize !== defaultPageSize) {
    params.set("pageSize", String(pageSize));
  }
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `${adminRoutes.clientReleases.list}?${query}` : adminRoutes.clientReleases.list;
}

async function resolveReleaseOverview() {
  const [runtime, testingDownloads, productionDownloads] = await Promise.allSettled([
    getRuntimeVersion(),
    listClientDownloads({ channel: "testing" }),
    listClientDownloads({ channel: "production" }),
  ]);

  return {
    runtime: runtime.status === "fulfilled" ? runtime.value : null,
    testingDownloads: testingDownloads.status === "fulfilled" ? testingDownloads.value : [],
    productionDownloads: productionDownloads.status === "fulfilled" ? productionDownloads.value : [],
  };
}

function ReleaseOverview({
  dictionary,
  locale,
  runtime,
  testingDownloads,
  productionDownloads,
  releases,
}: {
  dictionary: Awaited<ReturnType<typeof getAdminI18n>>["dictionary"];
  locale: string;
  runtime: RuntimeVersionInfo | null;
  testingDownloads: ClientDownloadRow[];
  productionDownloads: ClientDownloadRow[];
  releases: ClientReleaseRow[];
}) {
  const labels = dictionary.clientReleases;
  const diagnostics = buildReleaseDiagnostics({
    dictionary,
    locale,
    runtime,
    testingDownloads,
    productionDownloads,
    releases,
  });

  return (
    <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
      <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">{labels.runtimeTitle}</h2>
          <AdminStatusBadge tone={runtime ? "success" : "warning"}>
            {runtime ? labels.runtimeEnvironment : dictionary.states.apiUnavailable}
          </AdminStatusBadge>
        </div>
        <dl className="mt-4 grid gap-3 text-sm">
          <ReleaseOverviewItem label={labels.runtimeVersion} value={runtime?.version} />
          <ReleaseOverviewItem label={labels.runtimeEnvironment} value={runtime?.environment} />
          <ReleaseOverviewItem
            label={labels.runtimeSource}
            value={runtime?.sourceSha ? shortHash(runtime.sourceSha) : undefined}
            mono
          />
          <ReleaseOverviewItem
            label={labels.runtimeCheckedAt}
            value={runtime?.timestamp ? formatAdminDateTime(locale, runtime.timestamp) : undefined}
          />
        </dl>
      </section>

      <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">{labels.currentDownloads}</h2>
          <Badge variant="outline">
            {testingDownloads.length + productionDownloads.length} {labels.availableDownloads}
          </Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
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

      <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">{labels.diagnosticsTitle}</h2>
          <AdminStatusBadge tone={diagnostics.tone}>{diagnostics.status}</AdminStatusBadge>
        </div>
        <div className="mt-4 space-y-3">
          {diagnostics.items.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{item.label}</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">
                    {item.detail}
                  </div>
                </div>
                <AdminStatusBadge tone={item.tone}>{item.status}</AdminStatusBadge>
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
  testingDownloads,
  productionDownloads,
  releases,
}: {
  dictionary: Awaited<ReturnType<typeof getAdminI18n>>["dictionary"];
  locale: string;
  runtime: RuntimeVersionInfo | null;
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
    runtime?.version && normalizedRuntimeSha && normalizedRuntimeSha !== "unknown",
  );
  const diagnostics: Array<{
    label: string;
    detail: string;
    status: string;
    tone: DiagnosticTone;
  }> = [
    {
      label: labels.diagnosticRuntime,
      detail: runtimeKnown
        ? `${runtime?.version ?? "-"} · ${shortHash(normalizedRuntimeSha)}`
        : labels.diagnosticRuntimeUnavailable,
      status: runtimeKnown ? labels.diagnosticPassed : labels.diagnosticNeedsAttention,
      tone: runtimeKnown ? "success" : "warning",
    },
    {
      label: labels.diagnosticSourceMatch,
      detail: matchedRelease
        ? `${matchedRelease.releaseVersion} · ${formatClientReleaseChannel(matchedRelease.channel, locale)}`
        : latestRelease
          ? labels.diagnosticSourceMismatch
          : labels.diagnosticNoReleaseRecords,
      status: matchedRelease ? labels.diagnosticPassed : labels.diagnosticNeedsAttention,
      tone: matchedRelease ? "success" : "warning",
    },
    {
      label: labels.diagnosticTestingDownloads,
      detail: testingDownloads.length > 0
        ? `${testingDownloads.length} ${labels.availableDownloads}`
        : labels.unavailableDownloads,
      status: testingDownloads.length > 0
        ? labels.diagnosticPassed
        : labels.diagnosticNeedsAttention,
      tone: testingDownloads.length > 0 ? "success" : "warning",
    },
    {
      label: labels.diagnosticProductionDownloads,
      detail: productionDownloads.length > 0
        ? `${productionDownloads.length} ${labels.availableDownloads}`
        : labels.unavailableDownloads,
      status: productionDownloads.length > 0
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
    status: hasWarning ? labels.diagnosticNeedsAttention : labels.diagnosticPassed,
    tone: hasWarning ? "warning" as const : "success" as const,
  };
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
      <dd className={mono ? "font-mono text-xs text-foreground" : "text-right text-foreground"}>
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
    <div className="rounded-lg border border-border/70 bg-muted/10 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
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
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {formatClientPackageName(item.client, item.target, locale)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.version ?? item.shellVersion ?? "-"} · {formatFileSize(item.fileSize)}
                  </div>
                </div>
                <AdminStatusBadge tone="success">{formatClientTarget(item.target)}</AdminStatusBadge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function ClientReleasesPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const { me, accessToken } = await requireUserSession();
  const { dictionary, locale } = await getAdminI18n();
  assertPermission(me, "admin:client-releases:view");

  const params = searchParams ? await searchParams : undefined;
  const filters = normalizeFilters(params);
  const page = parsePositiveInt(params?.page, 1);
  const pageSize = parsePageSize(params?.pageSize, defaultPageSize);
  let result: Awaited<ReturnType<typeof listClientReleases>> | null = null;
  const overview = await resolveReleaseOverview();
  let pageError: unknown = null;

  try {
    result = await listClientReleases(accessToken, {
      page,
      pageSize,
      search: filters.search || undefined,
      channel: filters.channel || undefined,
      client: filters.client || undefined,
      target: filters.target || undefined,
      distributionStatus: filters.distributionStatus || undefined,
    });
  } catch (error) {
    pageError = error;
  }

  if (pageError || !result) {
    return (
      <ErrorBlock
        text={dictionary.states.apiUnavailable}
        detail={resolveErrorMessage(pageError)}
      />
    );
  }

  if (page > result.meta.totalPages) {
    redirect(buildHref(result.meta.totalPages, pageSize, filters));
  }

  const columns: AdminTableColumn<ClientReleaseRow>[] = [
    {
      id: "version",
      header: dictionary.clientReleases.releaseVersion,
      cellClassName: "font-medium",
      cell: (item) => (
        <div className="space-y-1">
          <div>{item.releaseVersion}</div>
          {item.dryRun ? (
            <Badge variant="outline">{dictionary.clientReleases.dryRun}</Badge>
          ) : null}
        </div>
      ),
    },
    {
      id: "channel",
      header: dictionary.clientReleases.channel,
      cell: (item) => (
        <Badge variant="outline">
          {formatClientReleaseChannel(item.channel, locale)}
        </Badge>
      ),
    },
    {
      id: "clients",
      header: dictionary.clientReleases.client,
      cell: (item) => (
        <AdminBadgeList
          formatValue={(value) => formatClientRole(value, locale)}
          values={item.clients}
        />
      ),
    },
    {
      id: "targets",
      header: dictionary.clientReleases.targets,
      cell: (item) => (
        <AdminBadgeList
          formatValue={formatClientTarget}
          values={item.targets}
        />
      ),
    },
    {
      id: "distributionStatus",
      header: dictionary.clientReleases.distributionStatus,
      cell: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.distributionStatuses.map((status) => (
            <AdminStatusBadge
              key={status}
              tone={getClientReleaseDistributionStatusTone(status)}
            >
              {getClientReleaseDistributionStatusLabel(status, locale)}
            </AdminStatusBadge>
          ))}
        </div>
      ),
    },
    {
      id: "downloadable",
      header: dictionary.clientReleases.downloadable,
      cell: (item) => `${item.downloadablePackageCount} / ${item.packageCount}`,
    },
    {
      id: "source",
      header: dictionary.clientReleases.source,
      cell: (item) => (
        <div className="space-y-1 text-xs">
          <div className="font-mono">{item.sourceSha.slice(0, 12)}</div>
          <div className="text-muted-foreground">{item.sourceRunId || <AdminEmptyValue />}</div>
        </div>
      ),
    },
    {
      id: "syncedAt",
      header: dictionary.clientReleases.syncedAt,
      cell: (item) => (
        item.syncedAt ? formatAdminDateTime(locale, item.syncedAt) : <AdminEmptyValue />
      ),
    },
    {
      id: "actions",
      header: dictionary.common.actions,
      headerClassName: "text-right",
      cellClassName: "text-right",
      cell: (item) => (
        <AdminTableRowActions>
          <AdminTableActionLink href={adminRoutes.clientReleases.detail(item.id)}>
            {dictionary.common.detail}
          </AdminTableActionLink>
        </AdminTableRowActions>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <ReleaseOverview
        dictionary={dictionary}
        locale={locale}
        runtime={overview.runtime}
        testingDownloads={overview.testingDownloads}
        productionDownloads={overview.productionDownloads}
        releases={result.data}
      />
      <AdminTablePage
        title={dictionary.clientReleases.title}
        subtitle={dictionary.clientReleases.subtitle}
        actions={(
          <Button asChild size="sm" variant="outline">
            <Link href={adminRoutes.clientReleases.packages}>
              {dictionary.clientReleases.viewPackages}
            </Link>
          </Button>
        )}
        emptyText={dictionary.clientReleases.empty}
        data={result.data}
        columns={columns}
        getRowKey={(item) => item.id}
        toolbar={(
        <div className="grid gap-3">
          <AdminFilterToolbar>
            <input name="pageSize" type="hidden" value={pageSize} />
            <Input
              aria-label={dictionary.common.search}
              className="w-full lg:max-w-xs"
              defaultValue={filters.search}
              name="search"
              placeholder={dictionary.common.search}
            />
            <FormSelect
              ariaLabel={dictionary.clientReleases.channel}
              defaultValue={filters.channel}
              emptyLabel={dictionary.clientReleases.allChannels}
              name="channel"
              options={["testing", "production"].map((value) => ({
                label: formatClientReleaseChannel(value, locale),
                value,
              }))}
              triggerClassName="w-full lg:w-40"
            />
            <FormSelect
              ariaLabel={dictionary.clientReleases.client}
              defaultValue={filters.client}
              emptyLabel={dictionary.clientReleases.allClients}
              name="client"
              options={clients.map((value) => ({ label: formatClientRole(value, locale), value }))}
              triggerClassName="w-full lg:w-44"
            />
            <FormSelect
              ariaLabel={dictionary.clientReleases.target}
              defaultValue={filters.target}
              emptyLabel={dictionary.clientReleases.allTargets}
              name="target"
              options={targets.map((value) => ({ label: formatClientTarget(value), value }))}
              triggerClassName="w-full lg:w-36"
            />
            <FormSelect
              ariaLabel={dictionary.clientReleases.distributionStatus}
              defaultValue={filters.distributionStatus}
              emptyLabel={dictionary.clientReleases.allStatuses}
              name="distributionStatus"
              options={clientReleaseDistributionStatuses.map((value) => ({
                label: getClientReleaseDistributionStatusLabel(value, locale),
                value,
              }))}
              triggerClassName="w-full lg:w-40"
            />
            <AdminFilterActions>
              <Button type="submit" variant="outline">{dictionary.common.search}</Button>
              {Object.values(filters).some(Boolean) ? (
                <Button asChild type="button" variant="ghost">
                  <Link href={buildHref(1, pageSize, normalizeFilters())}>
                    {dictionary.common.clearFilters}
                  </Link>
                </Button>
              ) : null}
            </AdminFilterActions>
          </AdminFilterToolbar>
          <AdminFilterSummary
            items={[
              filters.search ? `${dictionary.common.search}: ${filters.search}` : undefined,
              filters.channel
                ? `${dictionary.clientReleases.channel}: ${formatClientReleaseChannel(filters.channel, locale)}`
                : undefined,
              filters.client
                ? `${dictionary.clientReleases.client}: ${formatClientRole(filters.client, locale)}`
                : undefined,
              filters.target
                ? `${dictionary.clientReleases.target}: ${formatClientTarget(filters.target)}`
                : undefined,
              filters.distributionStatus
                ? `${dictionary.clientReleases.distributionStatus}: ${getClientReleaseDistributionStatusLabel(filters.distributionStatus, locale)}`
                : undefined,
            ]}
          />
        </div>
        )}
        pagination={(
          <AdminTablePagination
            currentPage={result.meta.page}
            getPageHref={(nextPage) => buildHref(nextPage, pageSize, filters)}
            getPageSizeHref={(nextPageSize) => buildHref(1, nextPageSize, filters)}
            itemsPerPageLabel={dictionary.common.itemsPerPage}
            nextLabel={dictionary.common.nextPage}
            pageSize={pageSize}
            previousLabel={dictionary.common.previousPage}
            total={result.meta.total}
            totalItemsLabel={dictionary.common.totalItems}
            totalPages={result.meta.totalPages}
          />
        )}
      />
    </div>
  );
}
