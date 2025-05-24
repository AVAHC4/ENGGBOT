"use client"

import React, { useState } from 'react';
import { SidebarMenu, SidebarGroupLabel } from '@/components/blocks/sidebar';
import { cn } from '@/lib/utils';
import { X, AlertCircle } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  onRemoveMember?: (id: string) => void;
}

interface RemoveConfirmProps {
  member: TeamMember;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function RemoveConfirmDialog({ member, isOpen, onClose, onConfirm }: RemoveConfirmProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Remove Team Member
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to remove {member.name} from the team? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:justify-start">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Remove Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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

export function NavTeam({ title = "Team", members, className, onRemoveMember }: NavTeamProps) {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const handleRemoveClick = (e: React.MouseEvent, member: TeamMember) => {
    e.stopPropagation();
    setSelectedMember(member);
    setConfirmDialogOpen(true);
  };

  const handleConfirmRemove = () => {
    if (selectedMember && onRemoveMember) {
      onRemoveMember(selectedMember.id);
    }
  };

  return (
    <div className={cn("py-4", className)}>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <div className="mt-1 space-y-1">
        {members.map((member) => (
          <div 
            key={member.id} 
            className="px-3 py-2 rounded-md hover:bg-accent cursor-pointer group relative"
          >
            <TeamMemberAvatar member={member} />
            
            {onRemoveMember && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                      onClick={(e) => handleRemoveClick(e, member)}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove {member.name}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Remove {member.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        ))}
      </div>

      {selectedMember && (
        <RemoveConfirmDialog
          member={selectedMember}
          isOpen={confirmDialogOpen}
          onClose={() => setConfirmDialogOpen(false)}
          onConfirm={handleConfirmRemove}
        />
      )}
    </div>
  );
} 