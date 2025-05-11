"use client"

import { BadgeCheck, Bell, ChevronsUpDown, CreditCard, LogOut, Sparkles } from "lucide-react"
import { ChevronDown, Settings, Users, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { logout } from "@/lib/auth-helpers"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/blocks/sidebar"

export function NavUser({
  user = {
    name: "User",
    email: "user@example.com",
    avatar: "",
  },
  className
}: {
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  className?: string;
}) {
  // Handle logout click
  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-2 py-1.5",
        className
      )}
      data-slot="nav-user"
    >
      <Avatar className="h-8 w-8 rounded-full">
        {user.avatar ? (
          <AvatarImage src={user.avatar} alt={user.name} />
        ) : (
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {getInitials(user.name)}
          </AvatarFallback>
        )}
      </Avatar>
      <div className="grid flex-1 gap-px">
        <span className="truncate font-semibold">
          {user.name}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {user.email}
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton size="lg" className="data-[state=open]:bg-secondary">
            <ChevronDown className="h-3 w-3" />
            <span className="sr-only">Toggle menu</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end" className="w-60">
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex h-10 w-10 items-center justify-center">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <AvatarFallback className="bg-primary/10 text-primary h-8 w-8 rounded-full">
                  {getInitials(user.name)}
                </AvatarFallback>
              )}
            </div>
            <div className="grid gap-1">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a
              href="#"
              className="flex w-full cursor-pointer items-center gap-2"
            >
              <Settings className="size-3.5" />
              Account settings
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href="#"
              target="_blank"
              rel="noopener"
              className="flex w-full cursor-pointer items-center gap-2"
            >
              <Users className="size-3.5" />
              Team members
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href="#"
              className="flex w-full cursor-pointer items-center gap-2"
            >
              <FileText className="size-3.5" />
              Documentation
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <button
              onClick={handleLogout}
              className="flex w-full cursor-pointer items-center gap-2 text-destructive"
            >
              <LogOut className="size-3.5" />
              Logout
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Helper to get initials from name
function getInitials(name: string) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
} 