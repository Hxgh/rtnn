import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatClientPackageName,
  formatClientRole,
  formatClientTarget,
} from "@rtnn/config";
import { updateClientReleasePolicyAction } from "@/app/(dashboard)/client-releases/actions";
import { AdminFormField } from "@/src/components/admin/form-dialog";
import { AdminDetailItem, AdminDetailList } from "@/src/components/admin/detail-list";
import { DataPanel, PageFrame } from "@/src/components/admin/page-frame";
import { ErrorBlock } from "@/src/components/admin/state-block";
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
import { getAdminI18n } from "@/src/i18n/server";
import { getClientReleaseById } from "@/src/lib/api-client";
import { formatFileSize, shortHash } from "@/src/lib/admin-format";
import {
  getClientReleaseDistributionStatusLabel,
  getClientReleaseDistributionStatusTone,
} from "@/src/lib/client-release-display";
import { resolveErrorMessage } from "@/src/lib/errors";
import { hasPermission, assertPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";
import { formatAdminDateTime } from "@/src/lib/utils";

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

export default async function ClientReleaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ policyStatus?: string }>;
}) {
  const { me, accessToken } = await requireUserSession();
  const { dictionary, locale } = await getAdminI18n();
  assertPermission(me, "admin:client-releases:view");
  const canManagePolicy = hasPermission(me, "admin:client-releases:manage-policy");
  const { id } = await params;
  const policyStatus = (await searchParams)?.policyStatus;

  let release: Awaited<ReturnType<typeof getClientReleaseById>> | null = null;
  let pageError: unknown = null;
  try {
    release = await getClientReleaseById(accessToken, id);
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error
      ? Number((error as { status?: unknown }).status)
      : 0;
    if (status === 404) {
      notFound();
    }
    pageError = error;
  }

  if (pageError || !release) {
    return (
      <ErrorBlock
        text={dictionary.states.apiUnavailable}
        detail={resolveErrorMessage(pageError)}
      />
    );
  }

  return (
    <PageFrame
      title={dictionary.clientReleases.detailTitle}
      subtitle={release.releaseVersion}
    >
      <div className="space-y-3">
        {policyStatus === "saved" || policyStatus === "failed" ? (
          <Card
            className={
              policyStatus === "saved"
                ? "border-emerald-300/45 bg-emerald-50/60 dark:border-emerald-400/30 dark:bg-emerald-900/10"
                : "border-amber-300/45 bg-amber-50/60 dark:border-amber-400/30 dark:bg-amber-900/10"
            }
          >
            <CardContent className="p-4 text-sm">
              {policyStatus === "saved"
                ? dictionary.clientReleases.policySaved
                : dictionary.clientReleases.policySaveFailed}
            </CardContent>
        </Card>
      ) : null}

        <DataPanel className="p-6">
          <AdminDetailList className="md:grid-cols-3">
            <AdminDetailItem label={dictionary.clientReleases.releaseVersion} value={release.releaseVersion} />
            <AdminDetailItem label={dictionary.clientReleases.channel} value={<Badge variant="outline">{release.channel}</Badge>} />
            <AdminDetailItem label={dictionary.common.status} value={release.status} />
            <AdminDetailItem label={dictionary.clientReleases.source} value={release.sourceRepository} />
            <AdminDetailItem label={dictionary.clientReleases.sourceRun} value={release.sourceRunId} />
            <AdminDetailItem label={dictionary.clientReleases.sourceSha} value={<span className="font-mono">{release.sourceSha}</span>} />
            <AdminDetailItem
              label={dictionary.clientReleases.generatedAt}
              value={release.generatedAt ? formatAdminDateTime(locale, release.generatedAt) : null}
            />
            <AdminDetailItem
              label={dictionary.clientReleases.syncedAt}
              value={release.syncedAt ? formatAdminDateTime(locale, release.syncedAt) : null}
            />
            <AdminDetailItem
              label={dictionary.clientReleases.dryRun}
              value={release.dryRun ? dictionary.common.active : dictionary.common.inactive}
            />
          </AdminDetailList>
        </DataPanel>

        <DataPanel>
          <div className="border-b border-border/70 px-4 py-3">
            <h2 className="text-sm font-medium">{dictionary.clientReleases.packages}</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{dictionary.clientReleases.client}</TableHead>
                  <TableHead>{dictionary.clientReleases.fileName}</TableHead>
                  <TableHead>{dictionary.clientReleases.distributionStatus}</TableHead>
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
                        <div>{formatClientPackageName(item.client, item.target, locale)}</div>
                        <div className="text-xs text-muted-foreground">{formatClientTarget(item.target)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <AdminTextValue maxWidthClassName="max-w-72">{item.fileName}</AdminTextValue>
                        <AdminTextValue className="text-muted-foreground" maxWidthClassName="max-w-72">
                          {item.artifactName}
                        </AdminTextValue>
                        <div className="font-mono text-xs text-muted-foreground">{shortHash(item.sha256)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <AdminStatusBadge tone={getClientReleaseDistributionStatusTone(item.distributionStatus)}>
                        {getClientReleaseDistributionStatusLabel(item.distributionStatus, locale)}
                      </AdminStatusBadge>
                    </TableCell>
                    <TableCell>{formatFileSize(item.fileSize)}</TableCell>
                    <TableCell className="text-xs">
                      <LinkValue href={item.sourceUrl} label={dictionary.clientReleases.openSource} />
                    </TableCell>
                    <TableCell className="text-xs">
                      <LinkValue href={item.distributionUrl} label={dictionary.clientReleases.openDownload} />
                    </TableCell>
                    <TableCell>
                      <AdminBadgeList
                        emptyClassName="text-foreground"
                        values={item.blockers.length > 0
                          ? item.blockers
                          : [dictionary.clientReleases.noBlockers]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DataPanel>

        <DataPanel>
          <div className="border-b border-border/70 px-4 py-3">
            <h2 className="text-sm font-medium">{dictionary.clientReleases.policy}</h2>
          </div>
          <div className="divide-y divide-border/70">
            {release.policies.map((policy) => (
              <form
                action={updateClientReleasePolicyAction}
                className="grid gap-4 px-4 py-4"
                key={policy.id}
              >
                {(() => {
                  const hasCurrentOption = policy.releaseOptions.some(
                    (option) => option.id === policy.recommendedReleaseId,
                  );
                  const releaseOptions =
                    policy.recommendedReleaseId && !hasCurrentOption
                      ? [
                          {
                            id: policy.recommendedReleaseId,
                            releaseVersion:
                              policy.recommendedVersion ??
                              policy.recommendedReleaseId,
                          },
                          ...policy.releaseOptions,
                        ]
                      : policy.releaseOptions;

                  return (
                    <>
                      <input name="releaseId" type="hidden" value={release.id} />
                      <input name="policyId" type="hidden" value={policy.id} />
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{formatClientRole(policy.client, locale)}</Badge>
                        <Badge variant="outline">{formatClientTarget(policy.target)}</Badge>
                        <Badge variant="outline">{policy.channel}</Badge>
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
                        {[
                          ["enabled", dictionary.clientReleases.enabled, policy.enabled],
                          ["forceUpdate", dictionary.clientReleases.forceUpdate, policy.forceUpdate],
                          [
                            "allowGithubFallback",
                            dictionary.clientReleases.allowGithubFallback,
                            policy.allowGithubFallback,
                          ],
                        ].map(([name, label, checked]) => (
                          <label className="flex items-center gap-2 text-sm" key={String(name)}>
                            <input name={String(name)} type="hidden" value="false" />
                            <input
                              defaultChecked={Boolean(checked)}
                              disabled={!canManagePolicy}
                              name={String(name)}
                              type="checkbox"
                              value="true"
                            />
                            <span>{label}</span>
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
                          <Button size="sm" type="submit">{dictionary.clientReleases.savePolicy}</Button>
                        </div>
                      ) : null}
                    </>
                  );
                })()}
              </form>
            ))}
          </div>
        </DataPanel>
      </div>
    </PageFrame>
  );
}
