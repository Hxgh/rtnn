"use client";

import { RouteBreadcrumb } from "@/src/components/admin/shell/route-breadcrumb";
import { HeaderTools } from "@/src/components/admin/shell/header-tools";
import { Separator } from "@/src/components/ui/separator";
import { SidebarTrigger } from "@/src/components/ui/sidebar";
import type { AdminDictionary } from "@/src/i18n/dictionaries";

export function SiteHeader({
  dictionary,
}: {
  dictionary: Pick<AdminDictionary, "common" | "nav">;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 transition-[width,height] ease-linear backdrop-blur supports-[backdrop-filter]:bg-background/80 group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex min-w-0 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" srLabel={dictionary.common.toggleSidebar} />
        <Separator
          orientation="vertical"
          className="mr-2 hidden data-[orientation=vertical]:h-4 md:block"
        />
        <RouteBreadcrumb dictionary={dictionary} />
      </div>
      <div className="ml-auto flex items-center px-4 lg:px-6">
        <HeaderTools dictionary={{ common: dictionary.common }} />
      </div>
    </header>
  );
}
