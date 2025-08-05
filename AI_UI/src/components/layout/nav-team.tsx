"use client"

import React from 'react';
import { SidebarMenu, SidebarGroupLabel } from '@/components/blocks/sidebar';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { AddTeamMemberDialog } from '@/components/dialogs/add-team-member-dialog';
import { cn } from '@/lib/utils';

export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  lastSeen?: string;
}

interface NavTeamProps {
  title?: string;
  members: TeamMember[];
  className?: string;
}

export function TeamMemberAvatar({ member }: { member: TeamMember }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={`absolute inset-0 rounded-full ${
          member.isOnline ? "bg-green-500/20 animate-pulse" : ""
        } transition-all duration-300`} />
        {member.avatar ? (
          <img 
            src={member.avatar} 
            alt={member.name}
            className="relative z-10 h-6 w-6 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="relative z-10 h-6 w-6 rounded-full bg-muted flex items-center justify-center">
            <span className="text-xs font-medium">{member.name.charAt(0)}</span>
          </div>
        )}
        <span className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-background ${
          member.isOnline ? "bg-green-500" : "bg-gray-400"
        }`} />
      </div>
      <div className="flex flex-col">
        <span className="text-sm">{member.name}</span>
        <span className="text-xs text-muted-foreground">
          {member.isOnline ? "Online" : member.lastSeen || "Offline"}
        </span>
      </div>
    </div>
  );
}

export function NavTeam({ title = "Team", members, className }: NavTeamProps) {
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = React.useState(false);
  return (
    <div className={cn("py-4", className)}>
            <div className="flex items-center justify-between">
        <SidebarGroupLabel>{title}</SidebarGroupLabel>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsAddMemberDialogOpen(true)}>
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-1 space-y-1">
        {members.map((member) => (
          <div key={member.id} className="px-3 py-2 rounded-md hover:bg-accent cursor-pointer">
            <TeamMemberAvatar member={member} />
          </div>
        ))}
      </div>
      <AddTeamMemberDialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen} />
    </div>
  );
} 