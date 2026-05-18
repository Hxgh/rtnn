import { Button } from "@/src/components/ui/button";
import { ChangePasswordDialog } from "@/src/components/admin/change-password-dialog";
import { AdminDetailItem, AdminDetailList } from "@/src/components/admin/detail-list";
import { DataPanel, PageFrame } from "@/src/components/admin/page-frame";
import { NativeUpdatePanel } from "@/src/components/admin/native-update-panel";
import { Badge } from "@/src/components/ui/badge";
import { getAdminI18n } from "@/src/i18n/server";
import { requireUserSession } from "@/src/lib/session";

export default async function AccountPage() {
  const { me } = await requireUserSession();
  const { dictionary } = await getAdminI18n();

  return (
    <PageFrame title={dictionary.account.title}>
      <DataPanel className="space-y-6 p-6">
        <AdminDetailList className="md:grid-cols-3">
          <AdminDetailItem label={dictionary.account.email} value={me.email} />
          <AdminDetailItem label={dictionary.account.name} value={me.name} />
          <AdminDetailItem
            label={dictionary.account.roles}
            value={(
              <div className="flex flex-wrap gap-2">
              {me.roles.length === 0 ? (
                "-"
              ) : (
                me.roles.map((role) => (
                  <Badge key={role} variant="outline">{role}</Badge>
                ))
              )}
              </div>
            )}
          />
        </AdminDetailList>

        <section className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/15 p-5 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              {dictionary.account.securityTitle}
            </h2>
          </div>
          <ChangePasswordDialog
            dictionary={{
              account: dictionary.account,
              common: dictionary.common,
            }}
            trigger={<Button variant="outline">{dictionary.account.changePassword}</Button>}
          />
        </section>

        <NativeUpdatePanel dictionary={dictionary.account} />
      </DataPanel>
    </PageFrame>
  );
}
