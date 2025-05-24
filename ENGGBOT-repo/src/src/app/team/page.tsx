"use client";

import React, { useState } from 'react';
import { Mail, MessageSquare, Trash2, AlertCircle, UserMinus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { TeamMember } from '@/components/layout/nav-team';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

// Extended team member data with more information
interface ExtendedTeamMember extends TeamMember {
  role: string;
  email: string;
  bio?: string;
}

const initialTeamMembers: ExtendedTeamMember[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    avatar: "https://i.pravatar.cc/150?img=1",
    isOnline: true,
    role: "Product Manager",
    email: "sarah.johnson@example.com",
    bio: "Leading product strategy and roadmap development"
  },
  {
    id: "2",
    name: "Michael Chen",
    avatar: "https://i.pravatar.cc/150?img=8",
    isOnline: true,
    role: "Senior Developer",
    email: "michael.chen@example.com",
    bio: "Full-stack developer with 8+ years experience"
  },
  {
    id: "3",
    name: "Jessica Smith",
    avatar: "https://i.pravatar.cc/150?img=5",
    isOnline: false,
    lastSeen: "20m ago",
    role: "UI/UX Designer",
    email: "jessica.smith@example.com",
    bio: "Creating intuitive and beautiful user experiences"
  },
  {
    id: "4",
    name: "David Rodriguez",
    avatar: "https://i.pravatar.cc/150?img=3",
    isOnline: false,
    lastSeen: "1h ago",
    role: "Frontend Developer",
    email: "david.rodriguez@example.com",
    bio: "Specializing in React and modern JavaScript frameworks"
  },
  {
    id: "5",
    name: "Emma Wilson",
    avatar: "https://i.pravatar.cc/150?img=9",
    isOnline: true,
    role: "Project Manager",
    email: "emma.wilson@example.com",
    bio: "Coordinating team efforts and managing deadlines"
  },
  {
    id: "6",
    name: "James Taylor",
    avatar: "https://i.pravatar.cc/150?img=12",
    isOnline: false,
    lastSeen: "3h ago",
    role: "Backend Developer",
    email: "james.taylor@example.com",
    bio: "Focused on scalable architecture and performance optimization"
  }
];

interface RemoveConfirmDialogProps {
  member: ExtendedTeamMember;
  onConfirm: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function RemoveConfirmDialog({ member, onConfirm, open, onOpenChange }: RemoveConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Remove Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeamMemberCard({ 
  member, 
  onRemove 
}: { 
  member: ExtendedTeamMember;
  onRemove: (id: string) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex flex-col items-center p-6 bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-all">
      <div className="relative mb-4">
        <div className={`absolute inset-0 rounded-full ${
          member.isOnline ? "bg-green-500/20 animate-pulse" : ""
        } transition-all duration-300`} />
        {member.avatar ? (
          <img 
            src={member.avatar} 
            alt={member.name}
            className="relative z-10 h-24 w-24 rounded-full object-cover border-2 border-border"
          />
        ) : (
          <div className="relative z-10 h-24 w-24 rounded-full bg-muted flex items-center justify-center">
            <span className="text-2xl font-medium">{member.name.charAt(0)}</span>
          </div>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-background ${
                member.isOnline ? "bg-green-500" : "bg-gray-400"
              }`} />
            </TooltipTrigger>
            <TooltipContent>
              <p>{member.isOnline ? "Online" : `Last seen ${member.lastSeen || "a while ago"}`}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <h3 className="text-lg font-medium">{member.name}</h3>
      <p className="text-sm text-muted-foreground mb-2">{member.role}</p>
      
      {member.bio && (
        <p className="text-sm text-center text-muted-foreground mb-4">{member.bio}</p>
      )}
      
      <div className="flex gap-2 mt-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Mail className="h-4 w-4" />
                <span className="sr-only">Email {member.name}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{member.email}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <MessageSquare className="h-4 w-4" />
                <span className="sr-only">Message {member.name}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Send message to {member.name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remove {member.name}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Remove {member.name} from team</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <RemoveConfirmDialog 
          member={member}
          onConfirm={() => onRemove(member.id)}
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
        />
      </div>
    </div>
  );
}

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<ExtendedTeamMember[]>(initialTeamMembers);
  const [bulkRemoveDialogOpen, setBulkRemoveDialogOpen] = useState(false);
  const [selectedMembersToRemove, setSelectedMembersToRemove] = useState<Record<string, boolean>>({});

  const handleRemoveMember = (id: string) => {
    setTeamMembers(prevMembers => prevMembers.filter(member => member.id !== id));
  };
  
  // Handler for bulk removing team members
  const handleBulkRemove = () => {
    const memberIdsToRemove = Object.entries(selectedMembersToRemove)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id);
    
    if (memberIdsToRemove.length > 0) {
      setTeamMembers(prevMembers => 
        prevMembers.filter(member => !memberIdsToRemove.includes(member.id))
      );
      setSelectedMembersToRemove({});
      setBulkRemoveDialogOpen(false);
    }
  };
  
  // Handler for toggling a member selection
  const toggleMemberSelection = (id: string) => {
    setSelectedMembersToRemove(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Check if any members are selected
  const hasSelectedMembers = Object.values(selectedMembersToRemove).some(isSelected => isSelected);
  
  // Reset selections when dialog opens
  const handleOpenRemoveDialog = () => {
    setSelectedMembersToRemove({});
    setBulkRemoveDialogOpen(true);
  };

  return (
    <div className="container py-8 pl-12 max-w-6xl team-page relative">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground">Connect with your colleagues</p>
        </div>
        
        <Button 
          variant="destructive" 
          size="default"
          className="flex items-center gap-1 shadow-md hover:shadow-lg transition-all"
          onClick={handleOpenRemoveDialog}
        >
          <UserMinus className="h-4 w-4 mr-1" />
          Remove Team Members
        </Button>
      </header>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {teamMembers.map(member => (
          <TeamMemberCard 
            key={member.id} 
            member={member} 
            onRemove={handleRemoveMember}
          />
        ))}
      </div>
      
      {teamMembers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No team members available</p>
        </div>
      )}
      
      {/* Add a floating action button */}
      <Button
        variant="destructive"
        size="lg"
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-50"
        onClick={handleOpenRemoveDialog}
      >
        <UserMinus className="h-6 w-6" />
        <span className="sr-only">Remove Team Members</span>
      </Button>
      
      {/* Bulk Team Member Removal Dialog */}
      <Dialog open={bulkRemoveDialogOpen} onOpenChange={setBulkRemoveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserMinus className="h-5 w-5 text-destructive" />
              Remove Team Members
            </DialogTitle>
            <DialogDescription>
              Select the team members you want to remove from your team.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto py-4">
            {teamMembers.length > 0 ? (
              teamMembers.map((member) => (
                <div key={member.id} className="flex items-center space-x-3 px-2 py-2 hover:bg-accent rounded-md">
                  <Checkbox 
                    id={`bulk-member-${member.id}`} 
                    checked={!!selectedMembersToRemove[member.id]}
                    onCheckedChange={() => toggleMemberSelection(member.id)}
                  />
                  <label 
                    htmlFor={`bulk-member-${member.id}`}
                    className="flex items-center gap-2 flex-1 cursor-pointer text-sm"
                  >
                    <div className="relative mr-2">
                      {member.avatar ? (
                        <img 
                          src={member.avatar} 
                          alt={member.name}
                          className="h-8 w-8 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-xs font-medium">{member.name.charAt(0)}</span>
                        </div>
                      )}
                      <span className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-background ${
                        member.isOnline ? "bg-green-500" : "bg-gray-400"
                      }`} />
                    </div>
                    <div>
                      <span className="font-medium">{member.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {member.role}
                      </span>
                    </div>
                  </label>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No team members available
              </div>
            )}
          </div>
          
          <DialogFooter className="flex gap-2 sm:justify-start">
            <Button variant="ghost" onClick={() => setBulkRemoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkRemove}
              disabled={!hasSelectedMembers}
            >
              Remove Selected Members
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 