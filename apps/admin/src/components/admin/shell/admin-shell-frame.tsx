import type { AuthUser } from "@rtnn/shared-types";
import { AppSidebar } from "@/src/components/admin/shell/app-sidebar";
import { SiteHeader } from "@/src/components/admin/shell/site-header";
import { SidebarInset, SidebarProvider } from "@/src/components/ui/sidebar";
import type { AdminDictionary } from "@/src/i18n/dictionaries";
import type { AdminNavItem } from "@/src/lib/admin-routes";

type AdminShellFrameProps = {
  defaultSidebarOpen: boolean;
  user: AuthUser;
  onLogout: (formData: FormData) => Promise<void>;
  dictionary: Pick<AdminDictionary, "account" | "common" | "footer" | "nav">;
  navItems: AdminNavItem[];
  children: React.ReactNode;
};

export function AdminShellFrame({
  defaultSidebarOpen,
  user,
  onLogout,
  dictionary,
  navItems,
  children,
}: AdminShellFrameProps) {
  return (
    <SidebarProvider className="h-svh overflow-hidden" defaultOpen={defaultSidebarOpen}>
      <AppSidebar
        dictionary={dictionary}
        navItems={navItems}
        onLogout={onLogout}
        user={user}
        variant="inset"
      />
      <SidebarInset className="h-full min-h-0 min-w-0">
        <SiteHeader dictionary={{ common: dictionary.common, nav: dictionary.nav }} />
        <div className="@container/main min-h-0 flex flex-1 flex-col overflow-hidden">
          <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
