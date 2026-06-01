import Link from "next/link";
import {
  formatClientPackageName,
  formatClientRole,
  formatClientTarget,
} from "@rtnn/config";
import {
  AdminFilterActions,
  AdminFilterToolbar,
} from "@/src/components/admin/filter-toolbar";
import { FormSelect } from "@/src/components/admin/form-select";
import { AdminStatusBadge } from "@/src/components/admin/status-badge";
import {
  AdminEmptyValue,
  AdminFilterSummary,
  AdminTextValue,
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
import { formatFileSize, shortHash } from "@/src/lib/admin-format";
import {
  clientReleaseDistributionStatuses,
  formatClientReleaseChannel,
  getClientReleaseDistributionStatusLabel,
  getClientReleaseDistributionStatusTone,
  getClientReleaseStatusLabel,
} from "@/src/lib/client-release-display";
import { formatAdminDateTime } from "@/src/lib/utils";
import {
  buildPackagesHref,
  clients,
  type ClientReleaseFilters,
  normalizeFilters,
  targets,
} from "./filters";
import type { ClientPackageRow, ClientReleasesDictionary } from "./types";

export function buildClientPackageColumns({
  dictionary,
  locale,
}: {
  dictionary: ClientReleasesDictionary;
  locale: string;
}): AdminTableColumn<ClientPackageRow>[] {
  return [
    {
      id: "client",
      header: dictionary.clientReleases.client,
      cell: (item) => (
        <div className="space-y-1">
          <div>{formatClientPackageName(item.client, item.target, locale)}</div>
          <div className="text-xs text-muted-foreground">
            {formatClientRole(item.client, locale)} /{" "}
            {formatClientTarget(item.target)}
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
            <Badge variant="outline">
              {formatClientReleaseChannel(item.channel, locale)}
            </Badge>
            <Badge variant="outline">
              {getClientReleaseStatusLabel(item.releaseStatus, locale)}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      id: "artifact",
      header: dictionary.clientReleases.artifact,
      cell: (item) => (
        <div className="max-w-72 space-y-1">
          <AdminTextValue maxWidthClassName="max-w-72">
            {item.fileName || item.artifactName}
          </AdminTextValue>
          <AdminTextValue
            className="text-muted-foreground"
            maxWidthClassName="max-w-72"
          >
            {item.artifactName}
          </AdminTextValue>
        </div>
      ),
    },
    {
      id: "distributionStatus",
      header: dictionary.clientReleases.distributionStatus,
      cell: (item) => (
        <div className="space-y-1">
          <AdminStatusBadge
            tone={getClientReleaseDistributionStatusTone(
              item.distributionStatus,
            )}
          >
            {getClientReleaseDistributionStatusLabel(
              item.distributionStatus,
              locale,
            )}
          </AdminStatusBadge>
          <AdminTextValue
            className="text-muted-foreground"
            maxWidthClassName="max-w-28"
          >
            {item.distributionProvider}
          </AdminTextValue>
        </div>
      ),
    },
    {
      id: "file",
      header: dictionary.clientReleases.fileSize,
      cell: (item) => (
        <div className="space-y-1 text-xs">
          <div>{formatFileSize(item.fileSize)}</div>
          <div className="font-mono text-muted-foreground">
            {shortHash(item.sha256)}
          </div>
        </div>
      ),
    },
    {
      id: "source",
      header: dictionary.clientReleases.releaseSource,
      cell: (item) => (
        <div className="space-y-1 text-xs">
          <div className="font-mono">{shortHash(item.releaseSourceSha)}</div>
          <div className="text-muted-foreground">
            {item.releaseSourceRunId || <AdminEmptyValue />}
          </div>
          <div className="text-muted-foreground">
            {item.syncedAt ? (
              formatAdminDateTime(locale, item.syncedAt)
            ) : (
              <AdminEmptyValue />
            )}
          </div>
        </div>
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
            href={adminRoutes.clientReleases.detail(item.releaseId)}
          >
            {dictionary.common.detail}
          </AdminTableActionLink>
          {item.distributionUrl ? (
            <AdminTableActionLink external href={item.distributionUrl}>
              {dictionary.clientReleases.openDownload}
            </AdminTableActionLink>
          ) : null}
          {item.sourceUrl && item.sourceUrl !== item.distributionUrl ? (
            <AdminTableActionLink external href={item.sourceUrl}>
              {dictionary.clientReleases.openSource}
            </AdminTableActionLink>
          ) : null}
        </AdminTableRowActions>
      ),
    },
  ];
}

export function ClientPackageToolbar({
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
              <Link href={buildPackagesHref(1, pageSize, normalizeFilters())}>
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
