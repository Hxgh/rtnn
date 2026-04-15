import type { AuthUser } from "@rtnn/shared-types";
import { AdminShellFrame } from "@/src/components/admin/shell/admin-shell-frame";
import type { AdminDictionary } from "@/src/i18n/dictionaries";
import { buildAdminNavItems } from "@/src/lib/admin-routes";
import { hasPermission } from "@/src/lib/permissions";

type AdminShellProps = {
  defaultSidebarOpen: boolean;
  user: AuthUser;
  onLogout: (formData: FormData) => Promise<void>;
  dictionary: Pick<AdminDictionary, "account" | "common" | "footer" | "nav">;
  children: React.ReactNode;
};

export function AdminShell({
  defaultSidebarOpen,
  user,
  onLogout,
  dictionary,
  children,
}: AdminShellProps) {
  const navItems = buildAdminNavItems(dictionary);

  const visibleNavItems = navItems.filter(
    (item) => !item.permission || hasPermission(user, item.permission),
  );

  return (
    <AdminShellFrame
      defaultSidebarOpen={defaultSidebarOpen}
      dictionary={dictionary}
      navItems={visibleNavItems}
      onLogout={onLogout}
      user={user}
    >
      {children}
    </AdminShellFrame>
  );
}
