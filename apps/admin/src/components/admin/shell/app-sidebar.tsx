"use client";

import type * as React from "react";
import Link from "next/link";
import type { AuthUser } from "@rtnn/shared-types";
import { TEMPLATE_DISPLAY } from "@rtnn/config";
import { BrandLogoMark } from "@/src/components/brand/brand-logo";
import { NavMain } from "@/src/components/admin/shell/nav-main";
import { NavUser } from "@/src/components/admin/shell/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/src/components/ui/sidebar";
import type { AdminDictionary } from "@/src/i18n/dictionaries";
import type { AdminNavItem } from "@/src/lib/admin-routes";
import { adminRoutes } from "@/src/lib/admin-routes";

export function AppSidebar({
  dictionary,
  navItems,
  onLogout,
  user,
  ...props
}: {
  dictionary: Pick<AdminDictionary, "account" | "common" | "footer" | "nav">;
  navItems: AdminNavItem[];
  onLogout: (formData: FormData) => Promise<void>;
  user: AuthUser;
} & React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="icon"
      mobileDescription={dictionary.common.mobileSidebarDescription}
      mobileTitle={dictionary.common.sidebar}
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip={dictionary.common.appName}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Link href={adminRoutes.dashboard}>
                <BrandLogoMark className="size-8" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{TEMPLATE_DISPLAY.brand}</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    {dictionary.common.console}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain dictionary={{ nav: dictionary.nav }} items={navItems} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser
          dictionary={{
            account: dictionary.account,
            common: dictionary.common,
            footer: dictionary.footer,
          }}
          onLogout={onLogout}
          user={user}
        />
      </SidebarFooter>

      <SidebarRail srLabel={dictionary.common.toggleSidebar} />
    </Sidebar>
  );
}
