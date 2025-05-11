"use client"

import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  lastSeen?: string;
}

interface ChatPresenceIndicatorProps {
  members: TeamMember[];
  maxDisplay?: number;
  className?: string;
}

export function ChatPresenceIndicator({ 
  members, 
  maxDisplay = 3,
  className 
}: ChatPresenceIndicatorProps) {
  const sortedMembers = [...members].sort((a, b) => {
    // Sort online members first
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return 0;
  });

  const displayedMembers = sortedMembers.slice(0, maxDisplay);
  const additionalCount = sortedMembers.length - maxDisplay;

  return (
    <TooltipProvider>
      <div className={cn("flex items-center justify-center mx-auto", className)}>
        {displayedMembers.map((member) => (
          <Tooltip key={member.id}>
            <TooltipTrigger asChild>
              <div className="relative mx-1">
                <div className={`absolute inset-0 rounded-full ${
                  member.isOnline ? "bg-green-500/20 animate-pulse" : ""
                } transition-all duration-300`} />
                {member.avatar ? (
                  <img 
                    src={member.avatar} 
                    alt={member.name}
                    className="relative z-10 h-8 w-8 rounded-full object-cover border border-background"
                  />
                ) : (
                  <div className="relative z-10 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-medium">{member.name.charAt(0)}</span>
                  </div>
                )}
                <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-background ${
                  member.isOnline ? "bg-green-500" : "bg-gray-400"
                }`} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="text-sm">
                <p className="font-medium">{member.name}</p>
                <p className="text-xs text-muted-foreground">
                  {member.isOnline ? "Online now" : `Last seen ${member.lastSeen || "recently"}`}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
        
        {additionalCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium cursor-pointer mx-1">
                +{additionalCount}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="text-sm">
                <p>{additionalCount} more team members</p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
} 