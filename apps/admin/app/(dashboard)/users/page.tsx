import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateUserDialog, EditUserDialog } from "@/src/components/admin/users/user-form-dialogs";
import {
  AdminTableActionLink,
  AdminTablePagination,
  AdminTablePage,
  AdminTableRowActions,
  type AdminTableColumn,
} from "@/src/components/admin/table-page";
import { ErrorBlock } from "@/src/components/admin/state-block";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { getAdminI18n } from "@/src/i18n/server";
import { parsePageSize } from "@/src/lib/pagination";
import { listRoles, listUsers } from "@/src/lib/api-client";
import { adminRoutes } from "@/src/lib/admin-routes";
import { resolveErrorMessage } from "@/src/lib/errors";
import { assertPermission, hasPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";
import { parsePositiveInt } from "@/src/lib/utils";

const defaultUsersPageSize = 20;

type UserRow = Awaited<ReturnType<typeof listUsers>>["data"][number];
type UsersPageSearchParams = Promise<{ page?: string; pageSize?: string; search?: string }>;

function buildUsersHref(page: number, search: string, pageSize: number) {
  const params = new URLSearchParams();
  if (page > 1) {
    params.set("page", String(page));
  }
  if (pageSize !== defaultUsersPageSize) {
    params.set("pageSize", String(pageSize));
  }
  if (search) {
    params.set("search", search);
  }
  const query = params.toString();
  return query ? `${adminRoutes.users.list}?${query}` : adminRoutes.users.list;
}

function getUserStatusLabel(
  status: UserRow["status"],
  dictionary: Awaited<ReturnType<typeof getAdminI18n>>["dictionary"],
) {
  return status === "active" ? dictionary.common.active : dictionary.common.disabled;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams?: UsersPageSearchParams;
}) {
  const { me, accessToken } = await requireUserSession();
  const { dictionary, locale } = await getAdminI18n();
  assertPermission(me, "admin:users:view");
  const canCreateUser = hasPermission(me, "admin:users:create");
  const canUpdateUser = hasPermission(me, "admin:users:update");
  const needsRoleOptions = canCreateUser || canUpdateUser;
  const params = searchParams ? await searchParams : undefined;
  const search = String(params?.search ?? "").trim();
  const page = parsePositiveInt(params?.page, 1);
  const pageSize = parsePageSize(params?.pageSize, defaultUsersPageSize);

  let result: Awaited<ReturnType<typeof listUsers>> | null = null;
  let rolesResult: Awaited<ReturnType<typeof listRoles>> | null = null;
  let pageError: unknown = null;

  try {
    [result, rolesResult] = await Promise.all([
      listUsers(accessToken, {
        page,
        pageSize,
        search: search || undefined,
      }),
      needsRoleOptions ? listRoles(accessToken, { page: 1, pageSize: 100 }) : Promise.resolve(null),
    ]);
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
    redirect(buildUsersHref(result.meta.totalPages, search, pageSize));
  }

  const columns: AdminTableColumn<UserRow>[] = [
    {
      id: "name",
      header: dictionary.users.name,
      cell: (item) => item.name,
      cellClassName: "font-medium",
    },
    {
      id: "email",
      header: dictionary.users.email,
      cell: (item) => item.email,
    },
    {
      id: "roles",
      header: dictionary.users.roles,
      cell: (item) => (item.roles.length > 0 ? item.roles.join(", ") : "-"),
    },
    {
      id: "status",
      header: dictionary.users.status,
      cell: (item) => getUserStatusLabel(item.status, dictionary),
    },
    {
      id: "lastLoginAt",
      header: dictionary.users.lastLoginAt,
      cell: (item) => (
        item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString(locale) : "-"
      ),
    },
    {
      id: "actions",
      header: dictionary.common.actions,
      headerClassName: "text-right",
      cellClassName: "text-right",
      cell: (item) => (
        <AdminTableRowActions>
          <AdminTableActionLink href={adminRoutes.users.detail(item.id)}>
            {dictionary.common.detail}
          </AdminTableActionLink>
          {canUpdateUser && rolesResult ? (
            <EditUserDialog
              dictionary={dictionary}
              roles={rolesResult.data}
              user={item}
            />
          ) : null}
        </AdminTableRowActions>
      ),
    },
  ];

  return (
    <AdminTablePage
      title={dictionary.users.title}
      actions={
        canCreateUser && rolesResult ? (
          <CreateUserDialog dictionary={dictionary} roles={rolesResult.data} />
        ) : null
      }
      emptyText={dictionary.users.empty}
      data={result.data}
      columns={columns}
      getRowKey={(item) => item.id}
      toolbar={(
        <form className="flex flex-col gap-3 lg:flex-row lg:items-center" method="get">
          <input name="pageSize" type="hidden" value={pageSize} />
          <Input
            aria-label={dictionary.common.search}
            className="w-full lg:max-w-xs"
            defaultValue={search}
            name="search"
            placeholder={dictionary.common.search}
          />
          <div className="flex items-center gap-2">
            <Button type="submit" variant="outline">
              {dictionary.common.search}
            </Button>
            {search ? (
              <Button asChild type="button" variant="ghost">
                <Link href={buildUsersHref(1, "", pageSize)}>{dictionary.common.clearFilters}</Link>
              </Button>
            ) : null}
          </div>
        </form>
      )}
      pagination={(
        <AdminTablePagination
          currentPage={result.meta.page}
          getPageHref={(nextPage) => buildUsersHref(nextPage, search, pageSize)}
          getPageSizeHref={(nextPageSize) => buildUsersHref(1, search, nextPageSize)}
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
