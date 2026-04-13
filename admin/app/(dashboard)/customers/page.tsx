import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateCustomerDialog, EditCustomerDialog } from "@/src/components/admin/customers/customer-form-dialogs";
import {
  AdminTablePagination,
  AdminTablePage,
  AdminTableRowActions,
  type AdminTableColumn,
} from "@/src/components/admin/table-page";
import { ErrorBlock } from "@/src/components/admin/state-block";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Select } from "@/src/components/ui/select";
import { getAdminI18n } from "@/src/i18n/server";
import { parsePageSize } from "@/src/lib/pagination";
import {
  listCustomerGroups,
  listCustomers,
  listCustomerTags,
} from "@/src/lib/api-client";
import { adminRoutes } from "@/src/lib/admin-routes";
import { resolveErrorMessage } from "@/src/lib/errors";
import { assertPermission, hasPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";
import { cn, parsePositiveInt } from "@/src/lib/utils";

const defaultCustomersPageSize = 20;

type CustomerRow = Awaited<ReturnType<typeof listCustomers>>["data"][number];
type CustomerStatus = CustomerRow["status"];
type CustomersPageSearchParams = Promise<{
  page?: string;
  pageSize?: string;
  search?: string;
  status?: string;
  groupId?: string;
  tagId?: string;
}>;

const customerStatuses = ["active", "inactive", "blocked"] as const;

function isCustomerStatus(value: string): value is CustomerStatus {
  return customerStatuses.includes(value as CustomerStatus);
}

function normalizeFilters(
  params?: Awaited<CustomersPageSearchParams>,
): {
  search?: string;
  status?: CustomerStatus;
  groupId?: string;
  tagId?: string;
} {
  const search = String(params?.search ?? "").trim();
  const status = String(params?.status ?? "").trim();
  const groupId = String(params?.groupId ?? "").trim();
  const tagId = String(params?.tagId ?? "").trim();

  return {
    search: search || undefined,
    status: isCustomerStatus(status) ? status : undefined,
    groupId: groupId || undefined,
    tagId: tagId || undefined,
  };
}

function hasActiveFilters(filters: ReturnType<typeof normalizeFilters>) {
  return Boolean(filters.search || filters.status || filters.groupId || filters.tagId);
}

function buildCustomersHref(
  page: number,
  filters: ReturnType<typeof normalizeFilters>,
  pageSize: number,
) {
  const params = new URLSearchParams();
  if (page > 1) {
    params.set("page", String(page));
  }
  if (pageSize !== defaultCustomersPageSize) {
    params.set("pageSize", String(pageSize));
  }
  if (filters.search) {
    params.set("search", filters.search);
  }
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.groupId) {
    params.set("groupId", filters.groupId);
  }
  if (filters.tagId) {
    params.set("tagId", filters.tagId);
  }
  const query = params.toString();
  return query ? `${adminRoutes.customers}?${query}` : adminRoutes.customers;
}

function getCustomerStatusLabel(
  status: CustomerStatus,
  dictionary: Awaited<ReturnType<typeof getAdminI18n>>["dictionary"],
) {
  switch (status) {
    case "active":
      return dictionary.common.active;
    case "inactive":
      return dictionary.common.inactive;
    case "blocked":
      return dictionary.common.blocked;
  }
}

function getCustomerStatusClassName(status: CustomerStatus) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-900/20 dark:text-emerald-300";
    case "inactive":
      return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-400/30 dark:bg-slate-900/20 dark:text-slate-300";
    case "blocked":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-900/20 dark:text-amber-300";
  }
}

function renderNames(values?: string[]) {
  return values && values.length > 0 ? values.join(", ") : "-";
}

function CustomersToolbar({
  dictionary,
  filters,
  groupOptions,
  pageSize,
  showGroupFilter,
  showTagFilter,
  tagOptions,
}: {
  dictionary: Awaited<ReturnType<typeof getAdminI18n>>["dictionary"];
  filters: ReturnType<typeof normalizeFilters>;
  groupOptions: Awaited<ReturnType<typeof listCustomerGroups>>["data"];
  pageSize: number;
  showGroupFilter: boolean;
  showTagFilter: boolean;
  tagOptions: Awaited<ReturnType<typeof listCustomerTags>>["data"];
}) {
  return (
    <form className="flex flex-col gap-2.5 lg:flex-row lg:items-center" method="get">
      <input name="pageSize" type="hidden" value={pageSize} />
      <Input
        aria-label={dictionary.common.search}
        className="h-8 w-full lg:max-w-xs"
        defaultValue={filters.search ?? ""}
        name="search"
        placeholder={dictionary.common.search}
      />
      <Select
        aria-label={dictionary.customers.status}
        className="h-8 w-full lg:w-40"
        defaultValue={filters.status ?? ""}
        name="status"
      >
        <option value="">{dictionary.customers.allStatuses}</option>
        {customerStatuses.map((status) => (
          <option key={status} value={status}>
            {getCustomerStatusLabel(status, dictionary)}
          </option>
        ))}
      </Select>
      {showGroupFilter ? (
        <Select
          aria-label={dictionary.customers.groups}
          className="h-8 w-full lg:w-48"
          defaultValue={filters.groupId ?? ""}
          name="groupId"
        >
          <option value="">{dictionary.customers.allGroups}</option>
          {groupOptions.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </Select>
      ) : null}
      {showTagFilter ? (
        <Select
          aria-label={dictionary.customers.tags}
          className="h-8 w-full lg:w-48"
          defaultValue={filters.tagId ?? ""}
          name="tagId"
        >
          <option value="">{dictionary.customers.allTags}</option>
          {tagOptions.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </Select>
      ) : null}
      <div className="flex items-center gap-2">
        <Button size="sm" type="submit" variant="outline">
          {dictionary.common.search}
        </Button>
        {hasActiveFilters(filters) ? (
          <Button asChild size="sm" type="button" variant="ghost">
            <Link href={buildCustomersHref(1, {}, pageSize)}>{dictionary.common.clearFilters}</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams?: CustomersPageSearchParams;
}) {
  const { me, accessToken } = await requireUserSession();
  const { dictionary, locale } = await getAdminI18n();
  assertPermission(me, "admin:customers:view");

  const canCreateCustomer = hasPermission(me, "admin:customers:create");
  const canUpdateCustomer = hasPermission(me, "admin:customers:update");
  const canViewGroupOptions = hasPermission(me, "admin:customer-groups:view");
  const canViewTagOptions = hasPermission(me, "admin:customer-tags:view");
  const params = searchParams ? await searchParams : undefined;
  const filters = normalizeFilters(params);
  const page = parsePositiveInt(params?.page, 1);
  const pageSize = parsePageSize(params?.pageSize, defaultCustomersPageSize);

  let result: Awaited<ReturnType<typeof listCustomers>> | null = null;
  let pageError: unknown = null;

  try {
    result = await listCustomers(accessToken, {
      page,
      pageSize,
      ...filters,
    });
  } catch (error) {
    pageError = error;
  }

  const [groupsResult, tagsResult] = await Promise.all([
    canViewGroupOptions
      ? listCustomerGroups(accessToken, { page: 1, pageSize: 100 }).catch(() => null)
      : Promise.resolve(null),
    canViewTagOptions
      ? listCustomerTags(accessToken, { page: 1, pageSize: 100 }).catch(() => null)
      : Promise.resolve(null),
  ]);

  if (pageError || !result) {
    return (
      <ErrorBlock
        text={dictionary.states.apiUnavailable}
        detail={resolveErrorMessage(pageError)}
      />
    );
  }

  if (page > result.meta.totalPages) {
    redirect(buildCustomersHref(result.meta.totalPages, filters, pageSize));
  }

  const columns: AdminTableColumn<CustomerRow>[] = [
    {
      id: "name",
      header: dictionary.customers.name,
      cell: (item) => item.name,
      cellClassName: "font-medium",
    },
    {
      id: "email",
      header: dictionary.customers.email,
      cell: (item) => item.email,
    },
    {
      id: "phone",
      header: dictionary.customers.phone,
      cell: (item) => item.phone || "-",
    },
    {
      id: "groups",
      header: dictionary.customers.groups,
      cell: (item) => renderNames(item.groupNames),
    },
    {
      id: "tags",
      header: dictionary.customers.tags,
      cell: (item) => renderNames(item.tagNames),
    },
    {
      id: "status",
      header: dictionary.customers.status,
      cell: (item) => (
        <Badge
          className={cn("border", getCustomerStatusClassName(item.status))}
          variant="outline"
        >
          {getCustomerStatusLabel(item.status, dictionary)}
        </Badge>
      ),
    },
    {
      id: "lastLoginAt",
      header: dictionary.customers.lastLoginAt,
      cell: (item) => (
        item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString(locale) : "-"
      ),
    },
  ];

  if (canUpdateCustomer) {
    columns.push({
      id: "actions",
      header: dictionary.common.actions,
      headerClassName: "text-right",
      cellClassName: "text-right",
      cell: (item) => (
        <AdminTableRowActions>
          <EditCustomerDialog dictionary={dictionary} customer={item} />
        </AdminTableRowActions>
      ),
    });
  }

  return (
    <AdminTablePage
      title={dictionary.customers.title}
      actions={canCreateCustomer ? <CreateCustomerDialog dictionary={dictionary} /> : null}
      columns={columns}
      data={result.data}
      emptyText={dictionary.customers.empty}
      getRowKey={(item) => item.id}
      toolbar={(
        <CustomersToolbar
          dictionary={dictionary}
          filters={filters}
          groupOptions={groupsResult?.data ?? []}
          pageSize={pageSize}
          showGroupFilter={canViewGroupOptions}
          showTagFilter={canViewTagOptions}
          tagOptions={tagsResult?.data ?? []}
        />
      )}
      pagination={(
        <AdminTablePagination
          currentPage={result.meta.page}
          getPageHref={(nextPage) => buildCustomersHref(nextPage, filters, pageSize)}
          getPageSizeHref={(nextPageSize) => buildCustomersHref(1, filters, nextPageSize)}
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
