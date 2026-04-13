import { notFound } from "next/navigation";
import { EditRoleDialog } from "@/src/components/admin/roles/role-form-dialogs";
import { Badge } from "@/src/components/ui/badge";
import { DataPanel, PageFrame } from "@/src/components/admin/page-frame";
import { ErrorBlock } from "@/src/components/admin/state-block";
import { getAdminI18n } from "@/src/i18n/server";
import { getRoleById, listPermissions } from "@/src/lib/api-client";
import { resolveErrorMessage } from "@/src/lib/errors";
import { assertPermission, hasPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";

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
        <dl className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{dictionary.roles.roleName}</dt>
            <dd>{role.name}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{dictionary.roles.description}</dt>
            <dd>{role.description || "-"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{dictionary.roles.createdAt}</dt>
            <dd>{role.createdAt ? new Date(role.createdAt).toLocaleString(locale) : "-"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{dictionary.roles.updatedAt}</dt>
            <dd>{role.updatedAt ? new Date(role.updatedAt).toLocaleString(locale) : "-"}</dd>
          </div>
        </dl>
        <div>
          <p className="mb-2 text-sm text-muted-foreground">{dictionary.roles.permissions}</p>
          <div className="flex flex-wrap gap-2">
            {permissionKeys.length > 0 ? (
              permissionKeys.map((key) => (
                <Badge key={key} variant="outline">
                  {key}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </div>
        </div>
      </DataPanel>
    </PageFrame>
  );
}
