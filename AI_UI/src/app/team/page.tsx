"use client";

import React from 'react';
import { Mail, MessageSquare } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { TeamMember } from '@/components/layout/nav-team';

// Extended team member data with more information
interface ExtendedTeamMember extends TeamMember {
  role: string;
  email: string;
  bio?: string;
}

const teamMembers: ExtendedTeamMember[] = [
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

function TeamMemberCard({ member }: { member: ExtendedTeamMember }) {
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
      </div>
    </div>
  );
}

export default function TeamPage() {
  return (
    <div className="container py-8 pl-12 max-w-6xl team-page">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
        <p className="text-muted-foreground">Connect with your colleagues</p>
      </header>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {teamMembers.map(member => (
          <TeamMemberCard key={member.id} member={member} />
        ))}
      </div>
    </div>
  );
} 