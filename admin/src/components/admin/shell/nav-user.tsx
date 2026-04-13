"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { AuthUser } from "@rtnn/shared-types";
import {
  ChevronsUpDown,
  KeyRound,
  LogOut,
  UserRound,
} from "lucide-react";
import { ChangePasswordDialog } from "@/src/components/admin/change-password-dialog";
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/src/components/ui/sidebar";
import type { AdminDictionary } from "@/src/i18n/dictionaries";
import { adminRoutes } from "@/src/lib/admin-routes";

function getInitials(user: AuthUser) {
  const source = user.name.trim() || user.email.trim();
  const words = source.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function NavUser({
  user,
  onLogout,
  dictionary,
}: {
  user: AuthUser;
  onLogout: (formData: FormData) => Promise<void>;
  dictionary: Pick<AdminDictionary, "account" | "common" | "footer">;
}) {
  const { isMobile } = useSidebar();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const logoutFormRef = useRef<HTMLFormElement>(null);
  const displayName = user.name.trim() || user.email.trim();

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-0"
              >
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-sidebar-primary/10 text-sidebar-foreground">
                    {getInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    {user.email}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">{getInitials(user)}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={adminRoutes.account}>
                  <UserRound />
                  <span>{dictionary.account.profile}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setPasswordDialogOpen(true);
                }}
              >
                <KeyRound />
                <span>{dictionary.account.changePassword}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  logoutFormRef.current?.requestSubmit();
                }}
              >
                <LogOut />
                <span>{dictionary.footer.signOut}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <form ref={logoutFormRef} action={onLogout} className="hidden" />
      <ChangePasswordDialog
        dictionary={dictionary}
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
      />
    </>
  );
}
