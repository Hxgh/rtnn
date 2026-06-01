import Link from "next/link";
import { redirect } from "next/navigation";
import { API_PERMISSIONS } from "@rtnn/shared-types";
import {
  AdminTablePage,
  AdminTablePagination,
} from "@/src/components/admin/table-page";
import { ErrorBlock } from "@/src/components/admin/state-block";
import { Button } from "@/src/components/ui/button";
import { getAdminI18n } from "@/src/i18n/server";
import { adminRoutes } from "@/src/lib/admin-routes";
import { listClientPackages } from "@/src/lib/api-client";
import { resolveErrorMessage } from "@/src/lib/errors";
import { parsePageSize } from "@/src/lib/pagination";
import { assertPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";
import { parsePositiveInt } from "@/src/lib/utils";
import {
  buildPackagesHref,
  defaultPageSize,
  normalizeFilters,
} from "../filters";
import {
  buildClientPackageColumns,
  ClientPackageToolbar,
} from "../package-table";
import type { PageSearchParams } from "../types";

export default async function ClientPackagesPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const sessionPromise = requireUserSession();
  const i18nPromise = getAdminI18n();
  const params = searchParams ? await searchParams : undefined;
  const filters = normalizeFilters(params);
  const page = parsePositiveInt(params?.page, 1);
  const pageSize = parsePageSize(params?.pageSize, defaultPageSize);

  const { me, accessToken } = await sessionPromise;
  assertPermission(me, API_PERMISSIONS.adminClientReleasesView);
  const resultState = await listClientPackages(accessToken, {
    page,
    pageSize,
    search: filters.search || undefined,
    channel: filters.channel || undefined,
    client: filters.client || undefined,
    target: filters.target || undefined,
    distributionStatus: filters.distributionStatus || undefined,
  })
    .then((data) => ({ data, error: null }))
    .catch((error: unknown) => ({ data: null, error }));
  const { dictionary, locale } = await i18nPromise;

  if (resultState.error || !resultState.data) {
    return (
      <ErrorBlock
        text={dictionary.states.apiUnavailable}
        detail={resolveErrorMessage(resultState.error)}
      />
    );
  }

  const result = resultState.data;

  if (page > result.meta.totalPages) {
    redirect(buildPackagesHref(result.meta.totalPages, pageSize, filters));
  }

  return (
    <AdminTablePage
      title={dictionary.clientReleases.packagesTitle}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href={adminRoutes.clientReleases.list}>
            {dictionary.clientReleases.viewReleases}
          </Link>
        </Button>
      }
      emptyText={dictionary.clientReleases.empty}
      data={result.data}
      columns={buildClientPackageColumns({ dictionary, locale })}
      getRowKey={(item) => item.id}
      toolbar={
        <ClientPackageToolbar
          dictionary={dictionary}
          filters={filters}
          locale={locale}
          pageSize={pageSize}
        />
      }
      pagination={
        <AdminTablePagination
          currentPage={result.meta.page}
          getPageHref={(nextPage) =>
            buildPackagesHref(nextPage, pageSize, filters)
          }
          getPageSizeHref={(nextPageSize) =>
            buildPackagesHref(1, nextPageSize, filters)
          }
          itemsPerPageLabel={dictionary.common.itemsPerPage}
          nextLabel={dictionary.common.nextPage}
          pageSize={pageSize}
          previousLabel={dictionary.common.previousPage}
          total={result.meta.total}
          totalItemsLabel={dictionary.common.totalItems}
          totalPages={result.meta.totalPages}
        />
      }
    />
  );
}
