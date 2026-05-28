import Link from "next/link";
import { formatClientRole, formatClientTarget } from "@rtnn/config";
import { FormSelect } from "@/src/components/admin/form-select";
import {
  AdminFilterActions,
  AdminFilterToolbar,
} from "@/src/components/admin/filter-toolbar";
import { AdminStatusBadge } from "@/src/components/admin/status-badge";
import {
  AdminBadgeList,
  AdminEmptyValue,
  AdminFilterSummary,
} from "@/src/components/admin/table-display";
import {
  AdminTableActionLink,
  AdminTableRowActions,
  type AdminTableColumn,
} from "@/src/components/admin/table-page";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { adminRoutes } from "@/src/lib/admin-routes";
import {
  clientReleaseDistributionStatuses,
  formatClientReleaseChannel,
  getClientReleaseDistributionStatusLabel,
  getClientReleaseDistributionStatusTone,
} from "@/src/lib/client-release-display";
import { formatAdminDateTime } from "@/src/lib/utils";
import {
  buildHref,
  clients,
  type ClientReleaseFilters,
  normalizeFilters,
  targets,
} from "./filters";
import type { ClientReleaseRow, ClientReleasesDictionary } from "./types";

export function buildClientReleaseColumns({
  dictionary,
  locale,
}: {
  dictionary: ClientReleasesDictionary;
  locale: string;
}): AdminTableColumn<ClientReleaseRow>[] {
  return [
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
          <div className="text-muted-foreground">
            {item.sourceRunId || <AdminEmptyValue />}
          </div>
        </div>
      ),
    },
    {
      id: "syncedAt",
      header: dictionary.clientReleases.syncedAt,
      cell: (item) =>
        item.syncedAt ? (
          formatAdminDateTime(locale, item.syncedAt)
        ) : (
          <AdminEmptyValue />
        ),
    },
    {
      id: "actions",
      header: dictionary.common.actions,
      headerClassName: "text-right",
      cellClassName: "text-right",
      cell: (item) => (
        <AdminTableRowActions>
          <AdminTableActionLink
            href={adminRoutes.clientReleases.detail(item.id)}
          >
            {dictionary.common.detail}
          </AdminTableActionLink>
        </AdminTableRowActions>
      ),
    },
  ];
}

export function ClientReleaseToolbar({
  dictionary,
  filters,
  locale,
  pageSize,
}: {
  dictionary: ClientReleasesDictionary;
  filters: ClientReleaseFilters;
  locale: string;
  pageSize: number;
}) {
  return (
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
          options={clients.map((value) => ({
            label: formatClientRole(value, locale),
            value,
          }))}
          triggerClassName="w-full lg:w-44"
        />
        <FormSelect
          ariaLabel={dictionary.clientReleases.target}
          defaultValue={filters.target}
          emptyLabel={dictionary.clientReleases.allTargets}
          name="target"
          options={targets.map((value) => ({
            label: formatClientTarget(value),
            value,
          }))}
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
          <Button type="submit" variant="outline">
            {dictionary.common.search}
          </Button>
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
          filters.search
            ? `${dictionary.common.search}: ${filters.search}`
            : undefined,
          filters.channel
            ? `${dictionary.clientReleases.channel}: ${formatClientReleaseChannel(
                filters.channel,
                locale,
              )}`
            : undefined,
          filters.client
            ? `${dictionary.clientReleases.client}: ${formatClientRole(
                filters.client,
                locale,
              )}`
            : undefined,
          filters.target
            ? `${dictionary.clientReleases.target}: ${formatClientTarget(
                filters.target,
              )}`
            : undefined,
          filters.distributionStatus
            ? `${dictionary.clientReleases.distributionStatus}: ${getClientReleaseDistributionStatusLabel(
                filters.distributionStatus,
                locale,
              )}`
            : undefined,
        ]}
      />
    </div>
  );
}
