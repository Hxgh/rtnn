import { API_PERMISSIONS } from "@rtnn/shared-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { getAdminI18n } from "@/src/i18n/server";
import { getDashboardStats, listAuditLogs } from "@/src/lib/api-client";
import { assertPermission, hasPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";
import { ErrorBlock } from "@/src/components/admin/state-block";
import { AdminTextValue } from "@/src/components/admin/table-display";
import {
  formatAuditActionLabel,
  formatAuditDetailSummary,
  formatAuditResourceLabel,
} from "@/src/lib/admin-display";
import { resolveErrorMessage } from "@/src/lib/errors";
import { formatAdminDateTime } from "@/src/lib/utils";

export default async function DashboardPage() {
  const { me, accessToken } = await requireUserSession();
  const { dictionary, locale } = await getAdminI18n();
  const auditLabels = dictionary.auditLogs.labels;
  assertPermission(me, API_PERMISSIONS.adminDashboardView);
  const canViewAuditLogs = hasPermission(me, API_PERMISSIONS.adminAuditLogsView);

  let stats: Awaited<ReturnType<typeof getDashboardStats>> | null = null;
  let auditLogs: Awaited<ReturnType<typeof listAuditLogs>> | null = null;
  let pageError: unknown = null;

  try {
    stats = await getDashboardStats(accessToken);
  } catch (error) {
    pageError = error;
  }

  if (pageError || !stats) {
    return (
      <ErrorBlock
        text={dictionary.states.apiUnavailable}
        detail={resolveErrorMessage(pageError)}
      />
    );
  }

  if (canViewAuditLogs) {
    try {
      auditLogs = await listAuditLogs(accessToken, { page: 1, pageSize: 5 });
    } catch {
      auditLogs = null;
    }
  }

  return (
    <div className="grid gap-6">
      <Card className="animate-fade-up border-border/70 bg-card shadow-sm">
        <CardHeader>
          <CardTitle>{dictionary.dashboard.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <dl className="rounded-xl border border-border/70 bg-muted/35 p-4 text-sm">
            <div className="flex items-center justify-between">
              <dt>{dictionary.dashboard.totalUsers}</dt>
              <dd className="font-semibold">{stats.totalAdminUsers}</dd>
            </div>
          </dl>
          <dl className="rounded-xl border border-border/70 bg-muted/35 p-4 text-sm">
            <div className="flex items-center justify-between">
              <dt>{dictionary.dashboard.totalCustomers}</dt>
              <dd className="font-semibold">{stats.totalCustomers}</dd>
            </div>
          </dl>
          <dl className="rounded-xl border border-border/70 bg-muted/35 p-4 text-sm">
            <div className="flex items-center justify-between">
              <dt>{dictionary.dashboard.totalRoles}</dt>
              <dd className="font-semibold">{stats.totalRoles}</dd>
            </div>
          </dl>
          <dl className="rounded-xl border border-border/70 bg-muted/35 p-4 text-sm">
            <div className="flex items-center justify-between">
              <dt>{dictionary.dashboard.suspendedCustomers}</dt>
              <dd className="font-semibold">{stats.suspendedCustomers}</dd>
            </div>
          </dl>
          <dl className="rounded-xl border border-border/70 bg-muted/35 p-4 text-sm">
            <div className="flex items-center justify-between">
              <dt>{dictionary.dashboard.recentAuditCount}</dt>
              <dd className="font-semibold">{stats.recentAuditCount}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {canViewAuditLogs ? (
        <Card className="animate-fade-up border-border/70 bg-card shadow-sm">
          <CardHeader>
            <CardTitle>{dictionary.auditLogs.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!auditLogs ? (
              <p className="text-sm text-muted-foreground">{dictionary.states.apiUnavailable}</p>
            ) : auditLogs.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">{dictionary.auditLogs.empty}</p>
            ) : (
              auditLogs.data.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-muted/35 p-4 text-sm"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="font-medium text-foreground">
                      <AdminTextValue maxWidthClassName="max-w-96">
                        {formatAuditActionLabel(item.action, auditLabels)}
                      </AdminTextValue>
                    </div>
                    <div className="text-muted-foreground">
                      <AdminTextValue maxWidthClassName="max-w-96">
                        {`${item.actorName} · ${formatAuditResourceLabel(item.resourceType, auditLabels)}`}
                      </AdminTextValue>
                    </div>
                    {item.detail ? (
                      <div className="text-xs text-muted-foreground">
                        <AdminTextValue
                          className="text-muted-foreground"
                          maxWidthClassName="max-w-96"
                        >
                          {formatAuditDetailSummary(item.detail, locale)}
                        </AdminTextValue>
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground">
                    {formatAdminDateTime(locale, item.createdAt)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
