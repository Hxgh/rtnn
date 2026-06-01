import Link from "next/link";
import {
  formatClientPackageName,
  formatClientRole,
  formatClientTarget,
} from "@rtnn/config";
import { updateClientReleasePolicyAction } from "@/app/(dashboard)/client-releases/actions";
import {
  AdminDetailItem,
  AdminDetailList,
} from "@/src/components/admin/detail-list";
import { AdminFormField } from "@/src/components/admin/form-dialog";
import { AdminInfoPanel, DataPanel } from "@/src/components/admin/page-frame";
import { AdminStatusBadge } from "@/src/components/admin/status-badge";
import {
  AdminBadgeList,
  AdminEmptyValue,
  AdminTextValue,
} from "@/src/components/admin/table-display";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Textarea } from "@/src/components/ui/textarea";
import { formatFileSize, shortHash } from "@/src/lib/admin-format";
import {
  formatClientReleaseChannel,
  getClientReleaseDistributionStatusLabel,
  getClientReleaseDistributionStatusTone,
  getClientReleaseStatusLabel,
  getClientReleaseStatusTone,
} from "@/src/lib/client-release-display";
import { formatAdminDateTime } from "@/src/lib/utils";
import type { ClientReleaseDetail, ClientReleasesDictionary } from "./types";

type ClientReleasePolicy = ClientReleaseDetail["policies"][number];

function LinkValue({ href, label }: { href?: string | null; label: string }) {
  if (!href) {
    return <AdminEmptyValue />;
  }

  return (
    <Link
      className="text-primary underline-offset-4 hover:underline"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {label}
    </Link>
  );
}

export function ClientReleasePolicyStatusAlert({
  dictionary,
  status,
}: {
  dictionary: ClientReleasesDictionary;
  status?: string;
}) {
  if (status !== "saved" && status !== "failed") {
    return null;
  }

  return (
    <Card
      className={
        status === "saved"
          ? "border-emerald-300/45 bg-emerald-50/60 dark:border-emerald-400/30 dark:bg-emerald-900/10"
          : "border-amber-300/45 bg-amber-50/60 dark:border-amber-400/30 dark:bg-amber-900/10"
      }
    >
      <CardContent className="p-4 text-sm">
        {status === "saved"
          ? dictionary.clientReleases.policySaved
          : dictionary.clientReleases.policySaveFailed}
      </CardContent>
    </Card>
  );
}

export function ClientReleaseSummaryPanel({
  dictionary,
  locale,
  release,
}: {
  dictionary: ClientReleasesDictionary;
  locale: string;
  release: ClientReleaseDetail;
}) {
  return (
    <AdminInfoPanel>
      <AdminDetailList className="md:grid-cols-3">
        <AdminDetailItem
          label={dictionary.clientReleases.releaseVersion}
          value={release.releaseVersion}
        />
        <AdminDetailItem
          label={dictionary.clientReleases.channel}
          value={
            <Badge variant="outline">
              {formatClientReleaseChannel(release.channel, locale)}
            </Badge>
          }
        />
        <AdminDetailItem
          label={dictionary.common.status}
          value={
            <AdminStatusBadge tone={getClientReleaseStatusTone(release.status)}>
              {getClientReleaseStatusLabel(release.status, locale)}
            </AdminStatusBadge>
          }
        />
        <AdminDetailItem
          label={dictionary.clientReleases.source}
          value={release.sourceRepository}
        />
        <AdminDetailItem
          label={dictionary.clientReleases.sourceRun}
          value={release.sourceRunId}
        />
        <AdminDetailItem
          label={dictionary.clientReleases.sourceSha}
          value={<span className="font-mono">{release.sourceSha}</span>}
        />
        <AdminDetailItem
          label={dictionary.clientReleases.generatedAt}
          value={
            release.generatedAt
              ? formatAdminDateTime(locale, release.generatedAt)
              : null
          }
        />
        <AdminDetailItem
          label={dictionary.clientReleases.syncedAt}
          value={
            release.syncedAt
              ? formatAdminDateTime(locale, release.syncedAt)
              : null
          }
        />
        <AdminDetailItem
          label={dictionary.clientReleases.dryRun}
          value={
            release.dryRun
              ? dictionary.common.active
              : dictionary.common.inactive
          }
        />
      </AdminDetailList>
    </AdminInfoPanel>
  );
}

export function ClientReleasePackagesPanel({
  dictionary,
  locale,
  release,
}: {
  dictionary: ClientReleasesDictionary;
  locale: string;
  release: ClientReleaseDetail;
}) {
  return (
    <DataPanel>
      <div className="border-b border-border/70 px-4 py-3">
        <h2 className="text-sm font-medium">
          {dictionary.clientReleases.packages}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dictionary.clientReleases.client}</TableHead>
              <TableHead>{dictionary.clientReleases.fileName}</TableHead>
              <TableHead>
                {dictionary.clientReleases.distributionStatus}
              </TableHead>
              <TableHead>{dictionary.clientReleases.fileSize}</TableHead>
              <TableHead>{dictionary.clientReleases.sourceUrl}</TableHead>
              <TableHead>{dictionary.clientReleases.distributionUrl}</TableHead>
              <TableHead>{dictionary.clientReleases.blockers}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {release.packages.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div>
                      {formatClientPackageName(
                        item.client,
                        item.target,
                        locale,
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatClientTarget(item.target)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <AdminTextValue maxWidthClassName="max-w-72">
                      {item.fileName}
                    </AdminTextValue>
                    <AdminTextValue
                      className="text-muted-foreground"
                      maxWidthClassName="max-w-72"
                    >
                      {item.artifactName}
                    </AdminTextValue>
                    <div className="font-mono text-xs text-muted-foreground">
                      {shortHash(item.sha256)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>{formatFileSize(item.fileSize)}</TableCell>
                <TableCell className="text-xs">
                  <LinkValue
                    href={item.sourceUrl}
                    label={dictionary.clientReleases.openSource}
                  />
                </TableCell>
                <TableCell className="text-xs">
                  <LinkValue
                    href={item.distributionUrl}
                    label={dictionary.clientReleases.openDownload}
                  />
                </TableCell>
                <TableCell>
                  <AdminBadgeList
                    emptyClassName="text-foreground"
                    values={
                      item.blockers.length > 0
                        ? item.blockers
                        : [dictionary.clientReleases.noBlockers]
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DataPanel>
  );
}

export function ClientReleasePolicyPanel({
  canManagePolicy,
  dictionary,
  locale,
  release,
}: {
  canManagePolicy: boolean;
  dictionary: ClientReleasesDictionary;
  locale: string;
  release: ClientReleaseDetail;
}) {
  return (
    <DataPanel>
      <div className="border-b border-border/70 px-4 py-3">
        <h2 className="text-sm font-medium">
          {dictionary.clientReleases.policy}
        </h2>
      </div>
      <div className="divide-y divide-border/70">
        {release.policies.map((policy) => (
          <ClientReleasePolicyForm
            canManagePolicy={canManagePolicy}
            dictionary={dictionary}
            key={policy.id}
            locale={locale}
            policy={policy}
            releaseId={release.id}
          />
        ))}
      </div>
    </DataPanel>
  );
}

function ClientReleasePolicyForm({
  canManagePolicy,
  dictionary,
  locale,
  policy,
  releaseId,
}: {
  canManagePolicy: boolean;
  dictionary: ClientReleasesDictionary;
  locale: string;
  policy: ClientReleasePolicy;
  releaseId: string;
}) {
  const hasCurrentOption = policy.releaseOptions.some(
    (option) => option.id === policy.recommendedReleaseId,
  );
  const releaseOptions =
    policy.recommendedReleaseId && !hasCurrentOption
      ? [
          {
            id: policy.recommendedReleaseId,
            releaseVersion:
              policy.recommendedVersion ?? policy.recommendedReleaseId,
          },
          ...policy.releaseOptions,
        ]
      : policy.releaseOptions;
  const toggles = [
    {
      checked: policy.enabled,
      label: dictionary.clientReleases.enabled,
      name: "enabled",
    },
    {
      checked: policy.forceUpdate,
      label: dictionary.clientReleases.forceUpdate,
      name: "forceUpdate",
    },
    {
      checked: policy.allowGithubFallback,
      label: dictionary.clientReleases.allowGithubFallback,
      name: "allowGithubFallback",
    },
  ];

  return (
    <form
      action={updateClientReleasePolicyAction}
      className="grid gap-4 px-4 py-4"
    >
      <input name="releaseId" type="hidden" value={releaseId} />
      <input name="policyId" type="hidden" value={policy.id} />
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {formatClientRole(policy.client, locale)}
        </Badge>
        <Badge variant="outline">{formatClientTarget(policy.target)}</Badge>
        <Badge variant="outline">
          {formatClientReleaseChannel(policy.channel, locale)}
        </Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <AdminFormField
          htmlFor={`recommended-${policy.id}`}
          label={dictionary.clientReleases.recommendedVersion}
        >
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={policy.recommendedReleaseId ?? ""}
            disabled={!canManagePolicy}
            id={`recommended-${policy.id}`}
            name="recommendedReleaseId"
          >
            <option value="">-</option>
            {releaseOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.releaseVersion}
              </option>
            ))}
          </select>
        </AdminFormField>
        <AdminFormField
          htmlFor={`minimum-${policy.id}`}
          label={dictionary.clientReleases.minimumSupportedVersion}
        >
          <Input
            defaultValue={policy.minimumSupportedVersion ?? ""}
            disabled={!canManagePolicy}
            id={`minimum-${policy.id}`}
            name="minimumSupportedVersion"
          />
        </AdminFormField>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {toggles.map((item) => (
          <label className="flex items-center gap-2 text-sm" key={item.name}>
            <input name={item.name} type="hidden" value="false" />
            <input
              defaultChecked={item.checked}
              disabled={!canManagePolicy}
              name={item.name}
              type="checkbox"
              value="true"
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
      <AdminFormField
        htmlFor={`notes-${policy.id}`}
        label={dictionary.clientReleases.notes}
        reserveMessage={false}
      >
        <Textarea
          defaultValue={policy.notes ?? ""}
          disabled={!canManagePolicy}
          id={`notes-${policy.id}`}
          name="notes"
          rows={2}
        />
      </AdminFormField>
      {canManagePolicy ? (
        <div>
          <Button size="sm" type="submit">
            {dictionary.clientReleases.savePolicy}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
