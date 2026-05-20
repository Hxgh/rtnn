import { notFound } from "next/navigation";
import { AdminDetailItem, AdminDetailList } from "@/src/components/admin/detail-list";
import { EditRoleDialog } from "@/src/components/admin/roles/role-form-dialogs";
import { AdminBadgeList } from "@/src/components/admin/table-display";
import { DataPanel, PageFrame } from "@/src/components/admin/page-frame";
import { ErrorBlock } from "@/src/components/admin/state-block";
import { getAdminI18n } from "@/src/i18n/server";
import { getRoleById, listPermissions } from "@/src/lib/api-client";
import { resolveErrorMessage } from "@/src/lib/errors";
import { assertPermission, hasPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";
import { formatAdminDateTime } from "@/src/lib/utils";

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { me, accessToken } = await requireUserSession();
  const { dictionary, locale } = await getAdminI18n();
  assertPermission(me, "admin:roles:view");
  const canUpdateRole = hasPermission(me, "admin:roles:update");

  const { id } = await params;
  let role: Awaited<ReturnType<typeof getRoleById>> | null = null;
  let permissionsResult: Awaited<ReturnType<typeof listPermissions>> | null = null;
  let pageError: unknown = null;

  try {
    [role, permissionsResult] = await Promise.all([
      getRoleById(accessToken, id),
      canUpdateRole ? listPermissions(accessToken) : Promise.resolve(null),
    ]);
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error
      ? Number((error as { status?: unknown }).status)
      : 0;
    if (status === 404) {
      notFound();
    }
    pageError = error;
  }

  if (pageError || !role) {
    return (
      <ErrorBlock
        text={dictionary.states.apiUnavailable}
        detail={resolveErrorMessage(pageError)}
      />
    );
  }

  const permissionKeys = role.permissions ?? [];

  return (
    <PageFrame
      title={dictionary.roles.roleDetail}
      subtitle={role.name}
      actions={
        canUpdateRole && permissionsResult ? (
          <EditRoleDialog
            dictionary={dictionary}
            permissions={permissionsResult}
            role={role}
          />
        ) : null
      }
    >
      <DataPanel className="space-y-4 p-6">
        <AdminDetailList>
          <AdminDetailItem label={dictionary.roles.roleName} value={role.name} />
          <AdminDetailItem label={dictionary.roles.description} value={role.description} />
          <AdminDetailItem
            label={dictionary.roles.createdAt}
            value={role.createdAt ? formatAdminDateTime(locale, role.createdAt) : null}
          />
          <AdminDetailItem
            label={dictionary.roles.updatedAt}
            value={role.updatedAt ? formatAdminDateTime(locale, role.updatedAt) : null}
          />
        </AdminDetailList>
        <div>
          <p className="mb-2 text-sm text-muted-foreground">{dictionary.roles.permissions}</p>
          <AdminBadgeList maxWidthClassName="max-w-none" values={permissionKeys} />
        </div>
      </DataPanel>
    </PageFrame>
  );
}
