import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminFilterActions, AdminFilterToolbar } from "@/src/components/admin/filter-toolbar";
import { CreateRoleDialog, EditRoleDialog } from "@/src/components/admin/roles/role-form-dialogs";
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
import { listPermissions, listRoles } from "@/src/lib/api-client";
import { adminRoutes } from "@/src/lib/admin-routes";
import { resolveErrorMessage } from "@/src/lib/errors";
import { assertPermission, hasPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";
import { parsePositiveInt } from "@/src/lib/utils";

const defaultRolesPageSize = 20;

type RoleRow = Awaited<ReturnType<typeof listRoles>>["data"][number];
type RolesPageSearchParams = Promise<{ page?: string; pageSize?: string; search?: string }>;

function buildRolesHref(page: number, search: string, pageSize: number) {
  const params = new URLSearchParams();
  if (page > 1) {
    params.set("page", String(page));
  }
  if (pageSize !== defaultRolesPageSize) {
    params.set("pageSize", String(pageSize));
  }
  if (search) {
    params.set("search", search);
  }
  const query = params.toString();
  return query ? `${adminRoutes.roles.list}?${query}` : adminRoutes.roles.list;
}

export default async function RolesPage({
  searchParams,
}: {
  searchParams?: RolesPageSearchParams;
}) {
  const { me, accessToken } = await requireUserSession();
  const { dictionary, locale } = await getAdminI18n();
  assertPermission(me, "admin:roles:view");
  const canCreateRole = hasPermission(me, "admin:roles:create");
  const canUpdateRole = hasPermission(me, "admin:roles:update");
  const needsPermissionOptions = canCreateRole || canUpdateRole;
  const params = searchParams ? await searchParams : undefined;
  const search = String(params?.search ?? "").trim();
  const page = parsePositiveInt(params?.page, 1);
  const pageSize = parsePageSize(params?.pageSize, defaultRolesPageSize);

  let result: Awaited<ReturnType<typeof listRoles>> | null = null;
  let permissionsResult: Awaited<ReturnType<typeof listPermissions>> | null = null;
  let pageError: unknown = null;

  try {
    [result, permissionsResult] = await Promise.all([
      listRoles(accessToken, {
        page,
        pageSize,
        search: search || undefined,
      }),
      needsPermissionOptions ? listPermissions(accessToken) : Promise.resolve(null),
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
    redirect(buildRolesHref(result.meta.totalPages, search, pageSize));
  }

  const columns: AdminTableColumn<RoleRow>[] = [
    {
      id: "name",
      header: dictionary.roles.roleName,
      cell: (item) => item.name,
      cellClassName: "font-medium",
    },
    {
      id: "description",
      header: dictionary.roles.description,
      cell: (item) => item.description || "-",
    },
    {
      id: "permissions",
      header: dictionary.roles.permissions,
      cell: (item) => item.permissions?.length ?? 0,
    },
    {
      id: "updatedAt",
      header: dictionary.roles.updatedAt,
      cell: (item) => (item.updatedAt ? new Date(item.updatedAt).toLocaleString(locale) : "-"),
    },
    {
      id: "actions",
      header: dictionary.common.actions,
      headerClassName: "text-right",
      cellClassName: "text-right",
      cell: (item) => (
        <AdminTableRowActions>
          <AdminTableActionLink href={adminRoutes.roles.detail(item.id)}>
            {dictionary.common.detail}
          </AdminTableActionLink>
          {canUpdateRole && permissionsResult ? (
            <EditRoleDialog
              dictionary={dictionary}
              permissions={permissionsResult}
              role={item}
            />
          ) : null}
        </AdminTableRowActions>
      ),
    },
  ];

  return (
    <AdminTablePage
      title={dictionary.roles.title}
      actions={
        canCreateRole && permissionsResult ? (
          <CreateRoleDialog dictionary={dictionary} permissions={permissionsResult} />
        ) : null
      }
      emptyText={dictionary.roles.empty}
      data={result.data}
      columns={columns}
      getRowKey={(item) => item.id}
      toolbar={(
        <AdminFilterToolbar>
          <input name="pageSize" type="hidden" value={pageSize} />
          <Input
            aria-label={dictionary.common.search}
            className="w-full lg:max-w-xs"
            defaultValue={search}
            name="search"
            placeholder={dictionary.common.search}
          />
          <AdminFilterActions>
            <Button type="submit" variant="outline">
              {dictionary.common.search}
            </Button>
            {search ? (
              <Button asChild type="button" variant="ghost">
                <Link href={buildRolesHref(1, "", pageSize)}>{dictionary.common.clearFilters}</Link>
              </Button>
            ) : null}
          </AdminFilterActions>
        </AdminFilterToolbar>
      )}
      pagination={(
        <AdminTablePagination
          currentPage={result.meta.page}
          getPageHref={(nextPage) => buildRolesHref(nextPage, search, pageSize)}
          getPageSizeHref={(nextPageSize) => buildRolesHref(1, search, nextPageSize)}
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
