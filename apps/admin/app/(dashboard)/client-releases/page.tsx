import Link from "next/link";
import { redirect } from "next/navigation";
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
import { listClientReleases } from "@/src/lib/api-client";
import { resolveErrorMessage } from "@/src/lib/errors";
import { parsePageSize } from "@/src/lib/pagination";
import { assertPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";
import { cn, parsePositiveInt } from "@/src/lib/utils";

const defaultPageSize = 20;
const clients = ["adminDesktop", "appMobile"] as const;
const targets = ["android", "ios", "macos", "windows"] as const;
const distributionStatuses = ["pending", "synced", "failed", "pruned", "disabled"] as const;

type ClientReleaseRow = Awaited<ReturnType<typeof listClientReleases>>["data"][number];
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

function BadgeList({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {values.length > 0 ? values.map((value) => (
        <Badge key={value} variant="outline">{value}</Badge>
      )) : "-"}
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
      cell: (item) => <Badge variant="outline">{item.channel}</Badge>,
    },
    {
      id: "clients",
      header: dictionary.clientReleases.client,
      cell: (item) => <BadgeList values={item.clients} />,
    },
    {
      id: "targets",
      header: dictionary.clientReleases.targets,
      cell: (item) => <BadgeList values={item.targets} />,
    },
    {
      id: "distributionStatus",
      header: dictionary.clientReleases.distributionStatus,
      cell: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.distributionStatuses.map((status) => (
            <Badge key={status} className={cn("border", statusClassName(status))} variant="outline">
              {status}
            </Badge>
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
          <div className="text-muted-foreground">{item.sourceRunId || "-"}</div>
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
          <AdminTableActionLink href={adminRoutes.clientReleases.detail(item.id)}>
            {dictionary.common.detail}
          </AdminTableActionLink>
        </AdminTableRowActions>
      ),
    },
  ];

  return (
    <AdminTablePage
      title={dictionary.clientReleases.title}
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
            options={clients.map((value) => ({ label: value, value }))}
            triggerClassName="w-full lg:w-44"
          />
          <FormSelect
            ariaLabel={dictionary.clientReleases.target}
            defaultValue={filters.target}
            emptyLabel={dictionary.clientReleases.allTargets}
            name="target"
            options={targets.map((value) => ({ label: value, value }))}
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
