import { cookies } from "next/headers";
import { API_PERMISSIONS } from "@rtnn/shared-types";
import { AdminShell } from "@/src/components/admin/shell";
import { getAdminI18n } from "@/src/i18n/server";
import { assertPermission } from "@/src/lib/permissions";
import { SIDEBAR_COOKIE_NAME } from "@/src/lib/sidebar";
import { requireUserSession } from "@/src/lib/session";
import { logoutAction } from "@/app/(dashboard)/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { me } = await requireUserSession();
  assertPermission(me, API_PERMISSIONS.adminAccess);
  const { dictionary } = await getAdminI18n();
  const cookieStore = await cookies();
  const defaultSidebarOpen =
    cookieStore.get(SIDEBAR_COOKIE_NAME)?.value !== "false";

  return (
    <AdminShell
      defaultSidebarOpen={defaultSidebarOpen}
      dictionary={dictionary}
      user={me}
      onLogout={logoutAction}
    >
      {children}
    </AdminShell>
  );
}
