import Link from "next/link";
import { redirect } from "next/navigation";
import { API_PERMISSIONS } from "@rtnn/shared-types";
import { AdminFilterActions, AdminFilterToolbar } from "@/src/components/admin/filter-toolbar";
import { FormSelect } from "@/src/components/admin/form-select";
import { AdminStatusBadge } from "@/src/components/admin/status-badge";
import {
  AdminFilterSummary,
  AdminTextValue,
} from "@/src/components/admin/table-display";
import {
  AdminTablePagination,
  AdminTablePage,
  type AdminTableColumn,
} from "@/src/components/admin/table-page";
import { ErrorBlock } from "@/src/components/admin/state-block";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { getAdminI18n } from "@/src/i18n/server";
import { parsePageSize } from "@/src/lib/pagination";
import { listAuditLogs } from "@/src/lib/api-client";
import {
  formatAuditActionLabel,
  formatAuditDetailSummary,
  formatAuditResourceLabel,
} from "@/src/lib/admin-display";
import { adminRoutes } from "@/src/lib/admin-routes";
import { resolveErrorMessage } from "@/src/lib/errors";
import { assertPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";
import { formatAdminDateTime, parsePositiveInt } from "@/src/lib/utils";

const defaultAuditLogsPageSize = 50;

type AuditLogRow = Awaited<ReturnType<typeof listAuditLogs>>["data"][number];
type AuditLogsPageSearchParams = Promise<{
  page?: string;
  pageSize?: string;
  search?: string;
  actorType?: string;
  action?: string;
}>;

const auditActorTypes = ["admin", "customer", "system"] as const;

function isAuditActorType(value: string): value is AuditLogRow["actorType"] {
  return auditActorTypes.includes(value as AuditLogRow["actorType"]);
}

function normalizeFilters(
  params?: Awaited<AuditLogsPageSearchParams>,
): {
  search?: string;
  actorType?: AuditLogRow["actorType"];
  action?: string;
} {
  const search = String(params?.search ?? "").trim();
  const actorType = String(params?.actorType ?? "").trim();
  const action = String(params?.action ?? "").trim();

  return {
    search: search || undefined,
    actorType: isAuditActorType(actorType) ? actorType : undefined,
    action: action || undefined,
  };
}

function hasActiveFilters(filters: ReturnType<typeof normalizeFilters>) {
  return Boolean(filters.search || filters.actorType || filters.action);
}

function buildAuditLogsHref(
  page: number,
  filters: ReturnType<typeof normalizeFilters>,
  pageSize: number,
) {
  const params = new URLSearchParams();
  if (page > 1) {
    params.set("page", String(page));
  }
  if (pageSize !== defaultAuditLogsPageSize) {
    params.set("pageSize", String(pageSize));
  }
  if (filters.search) {
    params.set("search", filters.search);
  }
  if (filters.actorType) {
    params.set("actorType", filters.actorType);
  }
  if (filters.action) {
    params.set("action", filters.action);
  }
  const query = params.toString();
  return query ? `${adminRoutes.auditLogs}?${query}` : adminRoutes.auditLogs;
}

function getActorTypeLabel(
  actorType: AuditLogRow["actorType"],
  dictionary: Awaited<ReturnType<typeof getAdminI18n>>["dictionary"],
) {
  switch (actorType) {
    case "admin":
      return dictionary.auditLogs.adminActor;
    case "customer":
      return dictionary.auditLogs.customerActor;
    case "system":
      return dictionary.auditLogs.systemActor;
  }
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams?: AuditLogsPageSearchParams;
}) {
  const { me, accessToken } = await requireUserSession();
  const { dictionary, locale } = await getAdminI18n();
  assertPermission(me, API_PERMISSIONS.adminAuditLogsView);
  const params = searchParams ? await searchParams : undefined;
  const filters = normalizeFilters(params);
  const page = parsePositiveInt(params?.page, 1);
  const pageSize = parsePageSize(params?.pageSize, defaultAuditLogsPageSize);

  let result: Awaited<ReturnType<typeof listAuditLogs>> | null = null;
  let pageError: unknown = null;

  try {
    result = await listAuditLogs(accessToken, {
      page,
      pageSize,
      ...filters,
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
    redirect(buildAuditLogsHref(result.meta.totalPages, filters, pageSize));
  }

  const columns: AdminTableColumn<AuditLogRow>[] = [
    {
      id: "actorName",
      header: dictionary.auditLogs.actor,
      cell: (item) => (
        <div className="space-y-1">
          <AdminTextValue>{item.actorName}</AdminTextValue>
          <AdminStatusBadge tone={item.actorType === "system" ? "neutral" : "success"}>
            {getActorTypeLabel(item.actorType, dictionary)}
          </AdminStatusBadge>
        </div>
      ),
    },
    {
      id: "action",
      header: dictionary.auditLogs.action,
      cell: (item) => (
        <span title={item.action}>
          <AdminTextValue maxWidthClassName="max-w-48">
            {formatAuditActionLabel(item.action, locale)}
          </AdminTextValue>
        </span>
      ),
    },
    {
      id: "resourceType",
      header: dictionary.auditLogs.resourceType,
      cell: (item) => (
        <span title={item.resourceId ?? undefined}>
          <AdminTextValue>
            {formatAuditResourceLabel(item.resourceType, locale)}
          </AdminTextValue>
        </span>
      ),
    },
    {
      id: "createdAt",
      header: dictionary.auditLogs.createdAt,
      cell: (item) => formatAdminDateTime(locale, item.createdAt),
    },
    {
      id: "detail",
      header: dictionary.auditLogs.detail,
      cell: (item) => (
        <AdminTextValue maxWidthClassName="max-w-80">
          {formatAuditDetailSummary(item.detail, locale)}
        </AdminTextValue>
      ),
    },
  ];

  return (
    <AdminTablePage
      title={dictionary.auditLogs.title}
      emptyText={dictionary.auditLogs.empty}
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
              defaultValue={filters.search ?? ""}
              name="search"
              placeholder={dictionary.common.search}
            />
            <Input
              aria-label={dictionary.auditLogs.action}
              className="w-full lg:max-w-xs"
              defaultValue={filters.action ?? ""}
              name="action"
              placeholder={dictionary.auditLogs.action}
            />
            <FormSelect
              ariaLabel={dictionary.auditLogs.actorType}
              defaultValue={filters.actorType ?? ""}
              emptyLabel={dictionary.auditLogs.allActorTypes}
              name="actorType"
              options={auditActorTypes.map((actorType) => ({
                label: getActorTypeLabel(actorType, dictionary),
                value: actorType,
              }))}
              triggerClassName="w-full lg:w-48"
            />
            <AdminFilterActions>
              <Button type="submit" variant="outline">
                {dictionary.common.search}
              </Button>
              {hasActiveFilters(filters) ? (
                <Button asChild type="button" variant="ghost">
                  <Link href={buildAuditLogsHref(1, {}, pageSize)}>{dictionary.common.clearFilters}</Link>
                </Button>
              ) : null}
            </AdminFilterActions>
          </AdminFilterToolbar>
          <AdminFilterSummary
            items={[
              filters.search ? `${dictionary.common.search}: ${filters.search}` : undefined,
              filters.action ? `${dictionary.auditLogs.action}: ${filters.action}` : undefined,
              filters.actorType
                ? `${dictionary.auditLogs.actorType}: ${getActorTypeLabel(filters.actorType, dictionary)}`
                : undefined,
            ]}
          />
        </div>
      )}
      pagination={(
        <AdminTablePagination
          currentPage={result.meta.page}
          getPageHref={(nextPage) => buildAuditLogsHref(nextPage, filters, pageSize)}
          getPageSizeHref={(nextPageSize) => buildAuditLogsHref(1, filters, nextPageSize)}
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
