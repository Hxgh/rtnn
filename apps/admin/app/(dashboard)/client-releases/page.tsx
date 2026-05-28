import Link from "next/link";
import { redirect } from "next/navigation";
import { API_PERMISSIONS } from "@rtnn/shared-types";
import {
  AdminTablePagination,
  AdminTablePage,
} from "@/src/components/admin/table-page";
import { ErrorBlock } from "@/src/components/admin/state-block";
import { Button } from "@/src/components/ui/button";
import { getAdminI18n } from "@/src/i18n/server";
import { adminRoutes } from "@/src/lib/admin-routes";
import { listClientReleases } from "@/src/lib/api-client";
import { resolveErrorMessage } from "@/src/lib/errors";
import { parsePageSize } from "@/src/lib/pagination";
import { assertPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";
import { parsePositiveInt } from "@/src/lib/utils";
import { resolveReleaseOverview } from "./data";
import { buildHref, defaultPageSize, normalizeFilters } from "./filters";
import { ReleaseOverview } from "./overview";
import { buildClientReleaseColumns, ClientReleaseToolbar } from "./table";
import type { PageSearchParams } from "./types";

export default async function ClientReleasesPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const sessionPromise = requireUserSession();
  const i18nPromise = getAdminI18n();
  const overviewPromise = resolveReleaseOverview();
  const params = searchParams ? await searchParams : undefined;
  const filters = normalizeFilters(params);
  const page = parsePositiveInt(params?.page, 1);
  const pageSize = parsePageSize(params?.pageSize, defaultPageSize);

  const { me, accessToken } = await sessionPromise;
  assertPermission(me, API_PERMISSIONS.adminClientReleasesView);
  const resultPromise = listClientReleases(accessToken, {
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

  const [{ dictionary, locale }, overview, resultState] = await Promise.all([
    i18nPromise,
    overviewPromise,
    resultPromise,
  ]);

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
    redirect(buildHref(result.meta.totalPages, pageSize, filters));
  }

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
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href={adminRoutes.clientReleases.packages}>
              {dictionary.clientReleases.viewPackages}
            </Link>
          </Button>
        }
        emptyText={dictionary.clientReleases.empty}
        data={result.data}
        columns={buildClientReleaseColumns({ dictionary, locale })}
        getRowKey={(item) => item.id}
        toolbar={
          <ClientReleaseToolbar
            dictionary={dictionary}
            filters={filters}
            locale={locale}
            pageSize={pageSize}
          />
        }
        pagination={
          <AdminTablePagination
            currentPage={result.meta.page}
            getPageHref={(nextPage) => buildHref(nextPage, pageSize, filters)}
            getPageSizeHref={(nextPageSize) =>
              buildHref(1, nextPageSize, filters)
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
    </div>
  );
}
