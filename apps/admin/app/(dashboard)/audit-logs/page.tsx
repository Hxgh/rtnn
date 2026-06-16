import Link from "next/link";
import { redirect } from "next/navigation";
import {
  API_PERMISSIONS,
  AUDIT_CATEGORIES,
  AUDIT_OUTCOMES,
  AUDIT_RESOURCE_TYPES,
  type AuditCategory,
  type AuditOutcome,
  type AuditResourceType,
} from "@rtnn/shared-types";
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
  formatAuditCategoryLabel,
  formatAuditActionLabel,
  formatAuditDetailSummary,
  formatAuditOutcomeLabel,
  formatAuditResourceLabel,
  getAuditActionOptions,
  getAuditCategoryOptions,
  getAuditOutcomeOptions,
  getAuditOutcomeTone,
  getAuditResourceTypeOptions,
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
  category?: string;
  outcome?: string;
  resourceType?: string;
  resourceId?: string;
  from?: string;
  to?: string;
}>;

const auditActorTypes = ["admin", "customer", "system"] as const;
const auditCategories = [...AUDIT_CATEGORIES] as readonly string[];
const auditOutcomes = [...AUDIT_OUTCOMES] as readonly string[];
const auditResourceTypes = [...AUDIT_RESOURCE_TYPES] as readonly string[];

function isAuditActorType(value: string): value is AuditLogRow["actorType"] {
  return auditActorTypes.includes(value as AuditLogRow["actorType"]);
}

function isAuditCategory(value: string): value is AuditCategory {
  return auditCategories.includes(value);
}

function isAuditOutcome(value: string): value is AuditOutcome {
  return auditOutcomes.includes(value);
}

function isAuditResourceType(value: string): value is AuditResourceType {
  return auditResourceTypes.includes(value);
}

function normalizeFilters(
  params?: Awaited<AuditLogsPageSearchParams>,
): {
  search?: string;
  actorType?: AuditLogRow["actorType"];
  action?: string;
  category?: AuditCategory;
  outcome?: AuditOutcome;
  resourceType?: AuditResourceType;
  resourceId?: string;
  from?: string;
  to?: string;
} {
  const search = String(params?.search ?? "").trim();
  const actorType = String(params?.actorType ?? "").trim();
  const action = String(params?.action ?? "").trim();
  const category = String(params?.category ?? "").trim();
  const outcome = String(params?.outcome ?? "").trim();
  const resourceType = String(params?.resourceType ?? "").trim();
  const resourceId = String(params?.resourceId ?? "").trim();
  const from = String(params?.from ?? "").trim();
  const to = String(params?.to ?? "").trim();

  return {
    search: search || undefined,
    actorType: isAuditActorType(actorType) ? actorType : undefined,
    action: action || undefined,
    category: isAuditCategory(category) ? category : undefined,
    outcome: isAuditOutcome(outcome) ? outcome : undefined,
    resourceType: isAuditResourceType(resourceType) ? resourceType : undefined,
    resourceId: resourceId || undefined,
    from: isDateInputValue(from) ? `${from}T00:00:00.000Z` : undefined,
    to: isDateInputValue(to) ? `${to}T23:59:59.999Z` : undefined,
  };
}

function hasActiveFilters(filters: ReturnType<typeof normalizeFilters>) {
  return Boolean(
    filters.search ||
      filters.actorType ||
      filters.action ||
      filters.category ||
      filters.outcome ||
      filters.resourceType ||
      filters.resourceId ||
      filters.from ||
      filters.to,
  );
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
  if (filters.category) {
    params.set("category", filters.category);
  }
  if (filters.outcome) {
    params.set("outcome", filters.outcome);
  }
  if (filters.resourceType) {
    params.set("resourceType", filters.resourceType);
  }
  if (filters.resourceId) {
    params.set("resourceId", filters.resourceId);
  }
  if (filters.from) {
    params.set("from", toDateInputValue(filters.from));
  }
  if (filters.to) {
    params.set("to", toDateInputValue(filters.to));
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

function toDateInputValue(value?: string) {
  return value?.slice(0, 10) ?? "";
}

function isDateInputValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams?: AuditLogsPageSearchParams;
}) {
  const { me, accessToken } = await requireUserSession();
  const { dictionary, locale } = await getAdminI18n();
  const auditLabels = dictionary.auditLogs.labels;
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
        <div className="space-y-1">
          <span title={item.action}>
            <AdminTextValue maxWidthClassName="max-w-48">
              {formatAuditActionLabel(item.action, auditLabels)}
            </AdminTextValue>
          </span>
          <AdminStatusBadge tone="neutral">
            {formatAuditCategoryLabel(item.category, auditLabels)}
          </AdminStatusBadge>
        </div>
      ),
    },
    {
      id: "resourceType",
      header: dictionary.auditLogs.resourceType,
      cell: (item) => (
        <div className="space-y-1">
          <span title={item.resourceId ?? undefined}>
            <AdminTextValue>
              {formatAuditResourceLabel(item.resourceType, auditLabels)}
            </AdminTextValue>
          </span>
          {item.resourceName || item.resourceId ? (
            <AdminTextValue maxWidthClassName="max-w-48">
              {item.resourceName ?? item.resourceId}
            </AdminTextValue>
          ) : null}
        </div>
      ),
    },
    {
      id: "outcome",
      header: dictionary.auditLogs.outcome,
      cell: (item) => (
        <AdminStatusBadge tone={getAuditOutcomeTone(item.outcome)}>
          {formatAuditOutcomeLabel(item.outcome, auditLabels)}
        </AdminStatusBadge>
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
              aria-label={dictionary.auditLogs.resourceId}
              className="w-full lg:max-w-xs"
              defaultValue={filters.resourceId ?? ""}
              name="resourceId"
              placeholder={dictionary.auditLogs.resourceId}
            />
            <Input
              aria-label={dictionary.auditLogs.from}
              className="w-full lg:w-40"
              defaultValue={toDateInputValue(filters.from)}
              name="from"
              placeholder={dictionary.auditLogs.from}
              type="date"
            />
            <Input
              aria-label={dictionary.auditLogs.to}
              className="w-full lg:w-40"
              defaultValue={toDateInputValue(filters.to)}
              name="to"
              placeholder={dictionary.auditLogs.to}
              type="date"
            />
            <FormSelect
              ariaLabel={dictionary.auditLogs.action}
              defaultValue={filters.action ?? ""}
              emptyLabel={dictionary.auditLogs.allActions}
              name="action"
              options={getAuditActionOptions(auditLabels)}
              triggerClassName="w-full lg:w-56"
            />
            <FormSelect
              ariaLabel={dictionary.auditLogs.category}
              defaultValue={filters.category ?? ""}
              emptyLabel={dictionary.auditLogs.allCategories}
              name="category"
              options={getAuditCategoryOptions(auditLabels)}
              triggerClassName="w-full lg:w-48"
            />
            <FormSelect
              ariaLabel={dictionary.auditLogs.outcome}
              defaultValue={filters.outcome ?? ""}
              emptyLabel={dictionary.auditLogs.allOutcomes}
              name="outcome"
              options={getAuditOutcomeOptions(auditLabels)}
              triggerClassName="w-full lg:w-44"
            />
            <FormSelect
              ariaLabel={dictionary.auditLogs.resourceType}
              defaultValue={filters.resourceType ?? ""}
              emptyLabel={dictionary.auditLogs.allResourceTypes}
              name="resourceType"
              options={getAuditResourceTypeOptions(auditLabels)}
              triggerClassName="w-full lg:w-52"
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
              filters.action
                ? `${dictionary.auditLogs.action}: ${formatAuditActionLabel(filters.action, auditLabels)}`
                : undefined,
              filters.category
                ? `${dictionary.auditLogs.category}: ${formatAuditCategoryLabel(filters.category, auditLabels)}`
                : undefined,
              filters.outcome
                ? `${dictionary.auditLogs.outcome}: ${formatAuditOutcomeLabel(filters.outcome, auditLabels)}`
                : undefined,
              filters.resourceType
                ? `${dictionary.auditLogs.resourceType}: ${formatAuditResourceLabel(filters.resourceType, auditLabels)}`
                : undefined,
              filters.resourceId ? `${dictionary.auditLogs.resourceId}: ${filters.resourceId}` : undefined,
              filters.from ? `${dictionary.auditLogs.from}: ${toDateInputValue(filters.from)}` : undefined,
              filters.to ? `${dictionary.auditLogs.to}: ${toDateInputValue(filters.to)}` : undefined,
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
