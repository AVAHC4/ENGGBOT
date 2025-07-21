"use client"

import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { logout } from "@/lib/auth-helpers"

export function NavUser({
  user = {
    name: "User",
    email: "user@example.com",
    avatar: "",
  },
}: {
  user?: {
    name: string
    email: string
    avatar?: string
  }
}) {
  // Handle logout click
  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
  };

  return (
    <div className="flex items-center gap-2 p-2 border-t border-border">
      <Avatar className="h-8 w-8 rounded-lg">
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 text-left text-sm leading-tight">
        <div className="truncate font-semibold">{user.name}</div>
        <div className="truncate text-xs text-muted-foreground">{user.email}</div>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleLogout}
        className="text-xs px-2 py-1"
      >
        Logout
      </Button>
    </div>
  )
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
