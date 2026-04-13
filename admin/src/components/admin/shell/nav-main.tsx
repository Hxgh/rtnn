"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid,
  ScrollText,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/src/components/ui/sidebar";
import type { AdminDictionary } from "@/src/i18n/dictionaries";
import type {
  AdminNavGroup,
  AdminNavIcon,
  AdminNavItem,
} from "@/src/lib/admin-routes";
import { adminRoutes } from "@/src/lib/admin-routes";

const groupOrder: AdminNavGroup[] = ["workspace", "business", "access", "system"];

const iconMap: Record<AdminNavIcon, LucideIcon> = {
  dashboard: LayoutGrid,
  customers: UserRound,
  users: Users,
  roles: ShieldCheck,
  "audit-logs": ScrollText,
};

function isItemActive(pathname: string, href: string) {
  if (href === adminRoutes.dashboard) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getGroupLabel(
  group: AdminNavGroup,
  dictionary: Pick<AdminDictionary, "nav">,
) {
  switch (group) {
    case "workspace":
      return dictionary.nav.workspaceSection;
    case "business":
      return dictionary.nav.businessSection;
    case "access":
      return dictionary.nav.accessSection;
    case "system":
      return dictionary.nav.systemSection;
  }
}

export function NavMain({
  dictionary,
  items,
}: {
  dictionary: Pick<AdminDictionary, "nav">;
  items: AdminNavItem[];
}) {
  const pathname = usePathname();

  const groupedItems = groupOrder
    .map((group) => ({
      group,
      label: getGroupLabel(group, dictionary),
      items: items.filter((item) => item.group === group),
    }))
    .filter((entry) => entry.items.length > 0);

  return (
    <>
      {groupedItems.map(({ group, label, items: groupItems }) => (
        <SidebarGroup key={group}>
          <SidebarGroupLabel>{label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {groupItems.map((item) => {
                const Icon = iconMap[item.icon];
                const active = isItemActive(pathname, item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
