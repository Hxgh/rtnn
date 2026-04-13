import { notFound } from "next/navigation";
import { EditUserDialog } from "@/src/components/admin/users/user-form-dialogs";
import { Badge } from "@/src/components/ui/badge";
import { DataPanel, PageFrame } from "@/src/components/admin/page-frame";
import { ErrorBlock } from "@/src/components/admin/state-block";
import { getAdminI18n } from "@/src/i18n/server";
import { getUserById, listRoles } from "@/src/lib/api-client";
import { resolveErrorMessage } from "@/src/lib/errors";
import { assertPermission, hasPermission } from "@/src/lib/permissions";
import { requireUserSession } from "@/src/lib/session";

function getUserStatusLabel(
  status: Awaited<ReturnType<typeof getUserById>>["status"],
  dictionary: Awaited<ReturnType<typeof getAdminI18n>>["dictionary"],
) {
  return status === "active" ? dictionary.common.active : dictionary.common.disabled;
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { me, accessToken } = await requireUserSession();
  const { dictionary, locale } = await getAdminI18n();
  assertPermission(me, "admin:users:view");
  const canUpdateUser = hasPermission(me, "admin:users:update");

  const { id } = await params;
  let user: Awaited<ReturnType<typeof getUserById>> | null = null;
  let rolesResult: Awaited<ReturnType<typeof listRoles>> | null = null;
  let pageError: unknown = null;

  try {
    [user, rolesResult] = await Promise.all([
      getUserById(accessToken, id),
      canUpdateUser ? listRoles(accessToken, { page: 1, pageSize: 100 }) : Promise.resolve(null),
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

  if (pageError || !user) {
    return (
      <ErrorBlock
        text={dictionary.states.apiUnavailable}
        detail={resolveErrorMessage(pageError)}
      />
    );
  }

  return (
    <PageFrame
      title={dictionary.users.userDetail}
      subtitle={user.email}
      actions={
        canUpdateUser && rolesResult ? (
          <EditUserDialog
            dictionary={dictionary}
            roles={rolesResult.data}
            user={user}
          />
        ) : null
      }
    >
      <DataPanel className="p-6">
        <dl className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{dictionary.users.name}</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{dictionary.users.email}</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{dictionary.users.roles}</dt>
            <dd className="flex flex-wrap gap-2">
              {user.roles.length > 0 ? (
                user.roles.map((role) => (
                  <Badge key={role} variant="outline">
                    {role}
                  </Badge>
                ))
              ) : (
                "-"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{dictionary.users.status}</dt>
            <dd>{getUserStatusLabel(user.status, dictionary)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{dictionary.users.createdAt}</dt>
            <dd>{user.createdAt ? new Date(user.createdAt).toLocaleString(locale) : "-"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{dictionary.users.lastLoginAt}</dt>
            <dd>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString(locale) : "-"}</dd>
          </div>
        </dl>
      </DataPanel>
    </PageFrame>
  );
}
