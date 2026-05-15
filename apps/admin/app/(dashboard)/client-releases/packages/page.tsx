import Link from "next/link";
import { redirect } from "next/navigation";
import {
  formatClientPackageName,
  formatClientRole,
  formatClientTarget,
} from "@rtnn/config";
import { FormSelect } from "@/src/components/admin/form-select";
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
import { listClientPackages } from "@/src/lib/api-client";
import { resolveErrorMessage } from "@/src/lib/errors";
import { parsePageSize } from "@/src/lib/pagination";
import { assertPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";
import { cn, parsePositiveInt } from "@/src/lib/utils";

const defaultPageSize = 20;
const clients = ["adminDesktop", "appMobile"] as const;
const targets = ["android", "ios", "macos", "windows"] as const;
const distributionStatuses = ["pending", "synced", "failed", "pruned", "disabled"] as const;

type ClientPackageRow = Awaited<ReturnType<typeof listClientPackages>>["data"][number];
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
  return query ? `${adminRoutes.clientReleases.packages}?${query}` : adminRoutes.clientReleases.packages;
}

function statusClassName(status: string) {
  if (status === "synced") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-900/20 dark:text-emerald-300";
  }
  if (status === "failed") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-900/20 dark:text-red-300";
  }
  if (status === "pruned" || status === "disabled") {
    return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-400/30 dark:bg-slate-900/20 dark:text-slate-300";
  }
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-900/20 dark:text-amber-300";
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

export default async function ClientPackagesPage({
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
  let result: Awaited<ReturnType<typeof listClientPackages>> | null = null;
  let pageError: unknown = null;

  try {
    result = await listClientPackages(accessToken, {
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

  const columns: AdminTableColumn<ClientPackageRow>[] = [
    {
      id: "client",
      header: dictionary.clientReleases.client,
      cell: (item) => (
        <div className="space-y-1">
          <div>{formatClientPackageName(item.client, item.target, locale)}</div>
          <div className="text-xs text-muted-foreground">
            {formatClientRole(item.client, locale)} / {formatClientTarget(item.target)}
          </div>
        </div>
      ),
    },
    {
      id: "release",
      header: dictionary.clientReleases.release,
      cell: (item) => (
        <div className="space-y-1">
          <Link
            className="font-medium underline-offset-4 hover:underline"
            href={adminRoutes.clientReleases.detail(item.releaseId)}
          >
            {item.releaseVersion}
          </Link>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline">{item.channel}</Badge>
            <Badge variant="outline">{item.releaseStatus}</Badge>
          </div>
        </div>
      ),
    },
    {
      id: "artifact",
      header: dictionary.clientReleases.artifact,
      cell: (item) => (
        <div className="max-w-72 space-y-1">
          <div className="break-all">{item.fileName || item.artifactName}</div>
          <div className="break-all text-xs text-muted-foreground">{item.artifactName}</div>
        </div>
      ),
    },
    {
      id: "distributionStatus",
      header: dictionary.clientReleases.distributionStatus,
      cell: (item) => (
        <Badge className={cn("border", statusClassName(item.distributionStatus))} variant="outline">
          {item.distributionStatus}
        </Badge>
      ),
    },
    {
      id: "provider",
      header: dictionary.clientReleases.provider,
      cell: (item) => item.distributionProvider,
    },
    {
      id: "file",
      header: dictionary.clientReleases.fileSize,
      cell: (item) => (
        <div className="space-y-1 text-xs">
          <div>{formatSize(item.fileSize)}</div>
          <div className="font-mono text-muted-foreground">{shortHash(item.sha256)}</div>
        </div>
      ),
    },
    {
      id: "source",
      header: dictionary.clientReleases.releaseSource,
      cell: (item) => (
        <div className="space-y-1 text-xs">
          <div className="font-mono">{shortHash(item.releaseSourceSha)}</div>
          <div className="text-muted-foreground">{item.releaseSourceRunId || "-"}</div>
        </div>
      ),
    },
    {
      id: "syncedAt",
      header: dictionary.clientReleases.syncedAt,
      cell: (item) => item.syncedAt ? new Date(item.syncedAt).toLocaleString(locale) : "-",
    },
    {
      id: "actions",
      header: dictionary.common.actions,
      headerClassName: "text-right",
      cellClassName: "text-right",
      cell: (item) => (
        <AdminTableRowActions>
          <AdminTableActionLink href={adminRoutes.clientReleases.detail(item.releaseId)}>
            {dictionary.common.detail}
          </AdminTableActionLink>
          {item.distributionUrl ? (
            <AdminTableActionLink href={item.distributionUrl}>
              {dictionary.clientReleases.openDownload}
            </AdminTableActionLink>
          ) : null}
          {item.sourceUrl && item.sourceUrl !== item.distributionUrl ? (
            <AdminTableActionLink href={item.sourceUrl}>
              {dictionary.clientReleases.openSource}
            </AdminTableActionLink>
          ) : null}
        </AdminTableRowActions>
      ),
    },
  ];

  return (
    <AdminTablePage
      title={dictionary.clientReleases.packagesTitle}
      actions={(
        <Button asChild size="sm" variant="outline">
          <Link href={adminRoutes.clientReleases.list}>
            {dictionary.clientReleases.viewReleases}
          </Link>
        </Button>
      )}
      emptyText={dictionary.clientReleases.empty}
      data={result.data}
      columns={columns}
      getRowKey={(item) => item.id}
      toolbar={(
        <form className="flex flex-col gap-3 lg:flex-row lg:items-center" method="get">
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
            options={["testing", "production"].map((value) => ({ label: value, value }))}
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
            options={distributionStatuses.map((value) => ({ label: value, value }))}
            triggerClassName="w-full lg:w-40"
          />
          <div className="flex items-center gap-2">
            <Button type="submit" variant="outline">{dictionary.common.search}</Button>
            {Object.values(filters).some(Boolean) ? (
              <Button asChild type="button" variant="ghost">
                <Link href={buildHref(1, pageSize, normalizeFilters())}>
                  {dictionary.common.clearFilters}
                </Link>
              </Button>
            ) : null}
          </div>
        </form>
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
  );
}
