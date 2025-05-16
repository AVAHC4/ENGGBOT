"use client";

import React, { useState, useEffect } from 'react';
import { Mail, MessageSquare, Users, UserPlus, UserMinus, PlusCircle, Bell, Share2, Upload } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { TeamMember } from '@/components/layout/nav-team';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { getAllConversationsMetadata } from '@/lib/storage';
import { useChat } from '@/context/chat-context';
import { formatDistanceToNow } from 'date-fns';

// Extended team member data with more information
interface ExtendedTeamMember extends TeamMember {
  role: string;
  email: string;
  bio?: string;
  pending?: boolean; // Add pending flag for invitation status
}

// Team interface for managing teams
interface Team {
  id: string;
  name: string;
  description: string;
  members: ExtendedTeamMember[];
  avatarColor: string; // For styling team avatars
  category: string;
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

// Initial teams data
const initialTeams: Team[] = [
  {
    id: "team1",
    name: "Frontend Squad",
    description: "Responsible for UI/UX implementation and frontend development",
    members: [teamMembers[2], teamMembers[3]], // Jessica and David
    avatarColor: "bg-blue-500",
    category: "Development",
  },
  {
    id: "team2",
    name: "Backend Heroes",
    description: "Handling server-side logic and database architecture",
    members: [teamMembers[1], teamMembers[5]], // Michael and James
    avatarColor: "bg-green-500",
    category: "Development",
  },
  {
    id: "team3",
    name: "Project Management",
    description: "Overseeing project timelines and coordination",
    members: [teamMembers[0], teamMembers[4]], // Sarah and Emma
    avatarColor: "bg-purple-500",
    category: "Management",
  },
  {
    id: "team4",
    name: "Design Wizards",
    description: "Creating beautiful and intuitive user experiences",
    members: [teamMembers[2]], // Jessica
    avatarColor: "bg-amber-500",
    category: "Design",
  },
  {
    id: "team5",
    name: "Full Stack Force",
    description: "End-to-end development across the stack",
    members: [teamMembers[1], teamMembers[3], teamMembers[5]], // Michael, David, James
    avatarColor: "bg-rose-500",
    category: "Development",
  }
];

// Define a type for notifications to properly type the properties
interface BaseNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: string;
}

interface InvitationNotification extends BaseNotification {
  type: 'invitation';
  memberId: string;
  teamName: string;
}

interface InfoNotification extends BaseNotification {
  type: 'info';
}

type Notification = InvitationNotification | InfoNotification;

// Add a new interface for shared conversations
interface SharedConversation {
  id: string;
  conversationId: string;
  title: string;
  sharedBy: string;
  sharedAt: string;
  message?: string;
  teamId: string;
}

// Add TeamMessage interface after SharedConversation interface
interface TeamMessage {
  id: string;
  teamId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

function TeamMemberCard({ member, onRemove }: { 
  member: ExtendedTeamMember;
  onRemove: (memberId: string) => void;
}) {
  return (
    <div className="flex flex-col items-center p-6 bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-all relative">
      {/* Show pending badge if member is pending */}
      {member.pending && (
        <Badge 
          variant="outline" 
          className="absolute top-3 left-3 bg-yellow-500/10 text-yellow-600 border-yellow-200"
        >
          Pending
        </Badge>
      )}
      
      {/* Remove Button */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-destructive"
          >
            <UserMinus className="h-4 w-4" />
            <span className="sr-only">Remove {member.name}</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {member.pending ? "Cancel Invitation" : "Remove Team Member"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {member.pending
                ? `Are you sure you want to cancel the invitation to ${member.name}?`
                : `Are you sure you want to remove ${member.name} from the team? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => onRemove(member.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {member.pending ? "Cancel Invitation" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
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
      
      {/* Add banner for pending members */}
      {member.pending && (
        <div className="w-full mt-4 py-2 px-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-md text-xs text-center">
          <p className="text-yellow-700 dark:text-yellow-300">Invitation pending</p>
        </div>
      )}
    </div>
  );
}

function TeamCard({ team, onJoin, onLeave, isMember }: { 
  team: Team;
  onJoin: (teamId: string) => void;
  onLeave: (teamId: string) => void;
  isMember: boolean;
}) {
  return (
    <Card className="w-full hover:shadow-md transition-all">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className={`${team.avatarColor} h-10 w-10 rounded-md flex items-center justify-center text-white font-semibold`}>
              {team.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <CardTitle className="text-lg">{team.name}</CardTitle>
              <Badge variant="outline" className="mt-1">{team.category}</Badge>
            </div>
          </div>
          {isMember ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-destructive hover:text-destructive flex gap-1 items-center"
                >
                  <UserMinus className="h-3.5 w-3.5" />
                  Leave
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave {team.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to leave this team? You can always rejoin later if needed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onLeave(team.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Leave Team
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="text-primary hover:text-primary flex gap-1 items-center"
              onClick={() => onJoin(team.id)}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Join
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{team.description}</p>
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Members ({team.members.length})</p>
          <div className="flex -space-x-2 overflow-hidden">
            {team.members.map((member, index) => (
              <TooltipProvider key={member.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-block h-8 w-8 rounded-full border-2 border-background">
                      {member.avatar ? (
                        <img 
                          src={member.avatar} 
                          alt={member.name}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full rounded-full bg-muted flex items-center justify-center">
                          <span className="text-xs font-medium">{member.name.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.role}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateTeamForm({ onSubmit, onCancel }: { 
  onSubmit: (name: string, description: string, category: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Development');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && description.trim()) {
      onSubmit(name, description, category);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="team-name" className="block text-sm font-medium mb-1">Team Name</label>
        <Input 
          id="team-name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="Frontend Squad" 
          required
        />
      </div>
      
      <div>
        <label htmlFor="team-description" className="block text-sm font-medium mb-1">Description</label>
        <Input 
          id="team-description" 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          placeholder="What does this team do?" 
          required
        />
      </div>
      
      <div>
        <label htmlFor="team-category" className="block text-sm font-medium mb-1">Category</label>
        <select 
          id="team-category" 
          value={category} 
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-md border border-input p-2 text-sm"
        >
          <option value="Development">Development</option>
          <option value="Design">Design</option>
          <option value="Management">Management</option>
          <option value="Marketing">Marketing</option>
          <option value="Sales">Sales</option>
          <option value="Other">Other</option>
        </select>
      </div>
      
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Create Team</Button>
      </div>
    </form>
  );
}

// Add a component for the conversation sharing dialog
function ShareConversationDialog({ 
  isOpen, 
  onClose, 
  onShare, 
  teamId 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onShare: (conversationId: string, message: string, teamId: string) => void;
  teamId: string;
}) {
  const [selectedConversation, setSelectedConversation] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [conversations, setConversations] = useState<any[]>([]);
  
  // Load conversations when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Get all available conversations
      const allConversations = getAllConversationsMetadata();
      setConversations(allConversations);
      setSelectedConversation('');
      setMessage('');
    }
  }, [isOpen]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedConversation) {
      onShare(selectedConversation, message, teamId);
      onClose();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Conversation</DialogTitle>
          <DialogDescription>
            Select a conversation to share with the team.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="conversation" className="text-sm font-medium">
              Conversation
            </label>
            <select
              id="conversation"
              value={selectedConversation}
              onChange={(e) => setSelectedConversation(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              required
            >
              <option value="">Select a conversation</option>
              {conversations.map((convo) => (
                <option key={convo.id} value={convo.id}>
                  {convo.title}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium">
              Message (optional)
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 min-h-[100px]"
              placeholder="Add a message about this conversation..."
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedConversation}
              className="flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add a component for displaying shared conversations
function SharedConversationCard({ 
  conversation, 
  onView 
}: { 
  conversation: SharedConversation; 
  onView: (conversationId: string) => void;
}) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => onView(conversation.conversationId)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          {conversation.title}
        </CardTitle>
        <CardDescription className="text-xs flex justify-between">
          <span>Shared by {conversation.sharedBy}</span>
          <span>{formatDistanceToNow(new Date(conversation.sharedAt), { addSuffix: true })}</span>
        </CardDescription>
      </CardHeader>
      {conversation.message && (
        <CardContent className="pt-0 pb-4">
          <p className="text-sm text-muted-foreground">{conversation.message}</p>
        </CardContent>
      )}
    </Card>
  );
}

// Replace the TeamChatDialog component with a full-page version
function TeamChatView({
  team,
  currentUserId,
  userData,
  onBack
}: {
  team: Team | null;
  currentUserId: string;
  userData: { name: string; email: string; avatar: string };
  onBack: () => void;
}) {
  const [message, setMessage] = useState('');
  const [teamMessages, setTeamMessages] = useState<TeamMessage[]>([]);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Load messages when team changes
  useEffect(() => {
    if (team) {
      // Get stored messages for this team
      if (typeof window !== 'undefined') {
        try {
          const savedMessages = localStorage.getItem(`team_chat_${team.id}`);
          if (savedMessages) {
            setTeamMessages(JSON.parse(savedMessages));
          } else {
            // If no messages, initialize with empty array
            setTeamMessages([]);
          }
        } catch (error) {
          console.error("Failed to load team messages", error);
          setTeamMessages([]);
        }
      }
    }
  }, [team]);

  // Save messages when they change
  useEffect(() => {
    if (team && teamMessages.length > 0) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`team_chat_${team.id}`, JSON.stringify(teamMessages));
        } catch (error) {
          console.error("Failed to save team messages", error);
        }
      }
    }
  }, [teamMessages, team]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [teamMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !team) return;
    
    // Create new message
    const newMessage: TeamMessage = {
      id: `msg-${Date.now()}`,
      teamId: team.id,
      senderId: currentUserId,
      senderName: userData.name,
      senderAvatar: userData.avatar,
      content: message,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    
    // Add to messages
    setTeamMessages(prev => [...prev, newMessage]);
    
    // Clear input
    setMessage('');
  };

  if (!team) return null;

  // Group messages by date
  const groupedMessages: { [date: string]: TeamMessage[] } = {};
  
  teamMessages.forEach(msg => {
    const date = new Date(msg.timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    if (!groupedMessages[date]) {
      groupedMessages[date] = [];
    }
    
    groupedMessages[date].push(msg);
  });

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Chat header */}
      <div className="flex items-center px-4 py-2 border-b">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack} 
          className="mr-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span className="sr-only">Back</span>
        </Button>
        
        <div className="flex items-center">
          <div className={`${team.avatarColor} h-10 w-10 rounded-md flex items-center justify-center text-white font-semibold mr-3`}>
            {team.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-semibold">{team.name}</h2>
            <p className="text-xs text-muted-foreground">
              {team.members.length} team members
            </p>
          </div>
        </div>
      </div>
      
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-accent/10">
        {Object.keys(groupedMessages).length > 0 ? (
          Object.entries(groupedMessages).map(([date, messages]) => (
            <div key={date} className="mb-6">
              <div className="flex justify-center mb-4">
                <div className="bg-accent/30 text-muted-foreground text-xs px-2 py-1 rounded-full">
                  {date}
                </div>
              </div>
              
              {messages.map((msg) => {
                const isMine = msg.senderId === currentUserId;
                const time = new Date(msg.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                });
                
                return (
                  <div 
                    key={msg.id} 
                    className={`flex mb-4 ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isMine && (
                      <div className="flex-shrink-0 mr-2">
                        {msg.senderAvatar ? (
                          <img 
                            src={msg.senderAvatar} 
                            alt={msg.senderName} 
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {msg.senderName.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div 
                      className={`max-w-[70%] rounded-lg px-3 py-2 ${
                        isMine 
                          ? 'bg-primary text-primary-foreground rounded-tr-none' 
                          : 'bg-card rounded-tl-none'
                      }`}
                    >
                      {!isMine && (
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          {msg.senderName}
                        </div>
                      )}
                      <div className="text-sm">{msg.content}</div>
                      <div className="text-right">
                        <span className={`text-[10px] ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {time}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No messages yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Be the first to start a conversation with your team members.
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input area */}
      <form onSubmit={handleSendMessage} className="border-t p-3 flex items-center gap-2">
        <Input
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1"
          autoFocus
        />
        <Button type="submit" size="icon" disabled={!message.trim()}>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="h-5 w-5"
          >
            <path d="m3 3 3 9-3 9 19-9Z" />
            <path d="M6 12h16" />
          </svg>
        </Button>
      </form>
    </div>
  );
}

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState('teams');
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [myTeams, setMyTeams] = useState<Team[]>([teams[0], teams[2]]); // Initial joined teams
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  
  // Initialize teamMembersList with a function to check localStorage first
  const [teamMembersList, setTeamMembersList] = useState<ExtendedTeamMember[]>(() => {
    // Only run in the browser, not during SSR
    if (typeof window !== 'undefined') {
      try {
        const savedMembers = localStorage.getItem('teamMembers');
        if (savedMembers) {
          return JSON.parse(savedMembers);
        }
      } catch (error) {
        console.error("Failed to load team members from localStorage", error);
      }
    }
    return teamMembers;
  });
  
  // Save to localStorage whenever teamMembersList changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('teamMembers', JSON.stringify(teamMembersList));
      } catch (error) {
        console.error("Failed to save team members to localStorage", error);
      }
    }
  }, [teamMembersList]);
  
  // For filtering teams
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  const categories = ['All', ...Array.from(new Set(teams.map(team => team.category)))];
  
  // Filter teams based on search and category
  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         team.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || team.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });
  
  const handleJoinTeam = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team && !myTeams.some(t => t.id === teamId)) {
      setMyTeams([...myTeams, team]);
      
      // Add notification when joining a team
      const newNotification: InfoNotification = {
        id: `joined-${Date.now()}`,
        title: "Joined Team",
        message: `You joined the ${team.name} team`,
        time: "Just now",
        read: false,
        type: "info"
      };
      
      setNotifications(prev => [newNotification, ...prev]);
    }
  };
  
  const handleLeaveTeam = (teamId: string) => {
    const team = myTeams.find(t => t.id === teamId);
    if (team) {
      setMyTeams(myTeams.filter(t => t.id !== teamId));
      
      // Add notification when leaving a team
      const newNotification: InfoNotification = {
        id: `left-${Date.now()}`,
        title: "Left Team",
        message: `You left the ${team.name} team`,
        time: "Just now",
        read: false,
        type: "info"
      };
      
      setNotifications(prev => [newNotification, ...prev]);
    }
  };
  
  const handleCreateTeam = (name: string, description: string, category: string) => {
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name,
      description,
      members: [], // Start with empty members
      avatarColor: `bg-${['blue', 'green', 'purple', 'amber', 'rose', 'indigo'][Math.floor(Math.random() * 6)]}-500`,
      category,
    };
    
    setTeams([...teams, newTeam]);
    setMyTeams([...myTeams, newTeam]); // Auto-join created team
    setShowCreateForm(false);
    
    // Add notification for team creation
    const newNotification: InfoNotification = {
      id: `team-created-${Date.now()}`,
      title: "Team Created",
      message: `You created the ${name} team`,
      time: "Just now",
      read: false,
      type: "info"
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  };
  
  const isInMyTeam = (teamId: string) => {
    return myTeams.some(team => team.id === teamId);
  };
  
  // Initialize notifications from localStorage or with an empty array
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    // Only run in the browser, not during SSR
    if (typeof window !== 'undefined') {
      try {
        const savedNotifications = localStorage.getItem('notifications');
        if (savedNotifications) {
          return JSON.parse(savedNotifications);
        }
      } catch (error) {
        console.error("Failed to load notifications from localStorage", error);
      }
    }
    return []; // Start with empty notifications instead of predefined ones
  });
  
  // Save notifications to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('notifications', JSON.stringify(notifications));
      } catch (error) {
        console.error("Failed to save notifications to localStorage", error);
      }
    }
  }, [notifications]);
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const markAllAsRead = () => {
    setNotifications(prevNotifications => 
      prevNotifications.map(n => ({ ...n, read: true }))
    );
  };
  
  // Function to add new notification for invitations
  const addInvitationNotification = (emailOrName: string, inviterId = "you") => {
    const newNotification: InfoNotification = {
      id: `notification-${Date.now()}`,
      title: "Team Invitation",
      message: `${inviterId === "you" ? "You invited" : inviterId + " invited"} ${emailOrName} to join the team`,
      time: "Just now",
      read: false,
      type: "info"
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  };

  // Function to add invitation received notification
  const addReceivedInvitationNotification = (inviterName: string, teamName: string, memberId: string) => {
    const newNotification: InvitationNotification = {
      id: `invitation-${Date.now()}`,
      title: "Team Invitation Received",
      message: `${inviterName} invited you to join ${teamName}`,
      time: "Just now",
      read: false,
      type: "invitation",
      memberId: memberId, // Store the member ID for accept/reject actions
      teamName: teamName
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  };

  // Update handleAddMember to create pending members and add notifications
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newMemberEmail.trim() && newMemberEmail.includes('@')) {
      // Create a basic new team member with pending status
      const newMember: ExtendedTeamMember = {
        id: `member-${Date.now()}`,
        name: newMemberEmail.split('@')[0], // Use part before @ as name
        email: newMemberEmail,
        isOnline: false,
        role: "New Member",
        lastSeen: "Just invited",
        avatar: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 20) + 1}`, // Random avatar
        bio: "Newly invited team member",
        pending: true // Mark as pending until accepted
      };
      
      // Add the new member to the list
      setTeamMembersList(prevMembers => [...prevMembers, newMember]);
      
      // Add notification for the sender
      addInvitationNotification(newMemberEmail);
      
      // In a real app, this would send an email or notification to the user
      // For demo purposes, we'll simulate the invited user receiving the notification
      // by adding it to their notifications
      setTimeout(() => {
        addReceivedInvitationNotification("You", "Your Team", newMember.id);
      }, 2000);
      
      // Show toast notification
      toast("Invitation sent", {
        description: `${newMemberEmail} has been invited to join the team`,
        action: {
          label: "Undo",
          onClick: () => {
            // Remove the newly added member
            setTeamMembersList(prevMembers => 
              prevMembers.filter(m => m.id !== newMember.id)
            );
            console.log("Undoing invitation to", newMemberEmail);
          },
        },
      });
      
      // Clear form
      setNewMemberEmail('');
      setShowAddMemberForm(false);
    }
  };
  
  // Update handleAcceptInvitation function return notification creation
  const handleAcceptInvitation = (memberId: string, notificationId: string) => {
    // Update the team member's pending status
    setTeamMembersList(prevMembers => 
      prevMembers.map(member => 
        member.id === memberId 
          ? { ...member, pending: false, lastSeen: "Just now", isOnline: true } 
          : member
      )
    );
    
    // Remove the invitation notification
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    // Add a confirmation notification
    const member = teamMembersList.find(m => m.id === memberId);
    if (member) {
      const newNotification: InfoNotification = {
        id: `accepted-${Date.now()}`,
        title: "Invitation Accepted",
        message: `You have joined the team`,
        time: "Just now",
        read: false,
        type: "info"
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      
      // Show toast notification
      toast("Invitation accepted", {
        description: `You have joined the team`,
      });
    }
  };

  // Update handleRejectInvitation function notification creation
  const handleRejectInvitation = (memberId: string, notificationId: string) => {
    // Remove the member from the team
    setTeamMembersList(prevMembers => 
      prevMembers.filter(m => m.id !== memberId)
    );
    
    // Remove the invitation notification
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    // Add a confirmation notification
    const newNotification: InfoNotification = {
      id: `rejected-${Date.now()}`,
      title: "Invitation Rejected",
      message: `You declined the team invitation`,
      time: "Just now",
      read: false,
      type: "info"
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Show toast notification
    toast("Invitation declined", {
      description: `You have declined to join the team`,
    });
  };
  
  // Update handleRemoveTeamMember to actually remove the member
  const handleRemoveTeamMember = (memberId: string) => {
    // Find the member to be removed
    const member = teamMembersList.find(m => m.id === memberId);
    if (member) {
      // Remove the member from teamMembersList
      setTeamMembersList(prevMembers => 
        prevMembers.filter(m => m.id !== memberId)
      );
      
      // Also remove the member from any teams they're part of
      setTeams(prevTeams => 
        prevTeams.map(team => ({
          ...team,
          members: team.members.filter(m => m.id !== memberId)
        }))
      );
      
      // Update myTeams to reflect the change as well
      setMyTeams(prevMyTeams => 
        prevMyTeams.map(team => ({
          ...team,
          members: team.members.filter(m => m.id !== memberId)
        }))
      );
      
      // Show toast notification
      toast(`Member removed`, {
        description: `${member.name} has been removed from the team`,
      });
      
      // In a real app, you would also make an API call here
      console.log(`Removed team member: ${member.name}`);
    }
  };
  
  // Add states for conversation sharing
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [activeTeamId, setActiveTeamId] = useState<string>('');
  const [sharedConversations, setSharedConversations] = useState<SharedConversation[]>(() => {
    // Load from localStorage on client side
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('shared_conversations');
        if (saved) return JSON.parse(saved);
      } catch (error) {
        console.error("Failed to load shared conversations", error);
      }
    }
    return [];
  });
  
  // Get current user data
  const [userData, setUserData] = useState<{ name: string; email: string; avatar: string }>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('user_data') || '{}') || {
          name: "User",
          email: "user@example.com",
          avatar: "",
        };
      } catch (error) {
        return {
          name: "User",
          email: "user@example.com",
          avatar: "",
        };
      }
    }
    return {
      name: "User",
      email: "user@example.com",
      avatar: "",
    };
  });
  
  // Access chat context for handling conversations
  const chat = useChat();
  
  // Save shared conversations to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('shared_conversations', JSON.stringify(sharedConversations));
      } catch (error) {
        console.error("Failed to save shared conversations", error);
      }
    }
  }, [sharedConversations]);
  
  // Add function to handle sharing a conversation
  const handleShareConversation = (conversationId: string, message: string, teamId: string) => {
    // Get conversation metadata
    const allConversations = getAllConversationsMetadata();
    const conversation = allConversations.find((c: { id: string }) => c.id === conversationId);
    
    if (!conversation) return;
    
    // Create a new shared conversation object
    const sharedConversation: SharedConversation = {
      id: `shared-${Date.now()}`,
      conversationId,
      title: conversation.title,
      sharedBy: userData.name,
      sharedAt: new Date().toISOString(),
      message: message || undefined,
      teamId
    };
    
    // Add to shared conversations
    setSharedConversations([...sharedConversations, sharedConversation]);
    
    // Add notification for the share
    const newNotification: InfoNotification = {
      id: `share-${Date.now()}`,
      title: "Conversation Shared",
      message: `You shared the conversation "${conversation.title}" with your team`,
      time: "Just now",
      read: false,
      type: "info"
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  };
  
  // Add function to view a shared conversation
  const handleViewSharedConversation = (conversationId: string) => {
    // Switch to the conversation using the chat context
    chat.switchConversation(conversationId);
    // Navigate to chat page
    window.location.href = "/";
  };
  
  // Function to get shared conversations for a specific team
  const getTeamSharedConversations = (teamId: string) => {
    return sharedConversations.filter(convo => convo.teamId === teamId);
  };

  // Add these new state variables after existing state variables
  const [activeChatTeam, setActiveChatTeam] = useState<Team | null>(null);
  const [currentUserId] = useState<string>(() => {
    // Generate or retrieve user ID
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('current_user_id');
      if (savedId) return savedId;
      
      const newId = `user-${Date.now()}`;
      localStorage.setItem('current_user_id', newId);
      return newId;
    }
    return `user-${Date.now()}`;
  });

  // Add this function to handle opening the team chat
  const handleOpenTeamChat = (team: Team) => {
    setActiveChatTeam(team);
  };

  // Add function to close the chat view
  const handleCloseTeamChat = () => {
    setActiveChatTeam(null);
  };

  // If a team chat is active, show the chat view instead of the regular content
  if (activeChatTeam) {
    return (
      <div className="container py-0 px-0 max-w-full h-screen team-page">
        <TeamChatView 
          team={activeChatTeam}
          currentUserId={currentUserId}
          userData={userData}
          onBack={handleCloseTeamChat}
        />
      </div>
    );
  }

  // Normal view when no chat is active
  return (
    <div className="container py-8 px-6 max-w-6xl team-page">
      <header className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
            <p className="text-muted-foreground">Collaborate with your colleagues</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end" showArrow>
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <h3 className="font-medium">Notifications</h3>
                  <div className="flex gap-2">
                    {notifications.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setNotifications([])}
                        className="text-xs text-destructive hover:text-destructive"
                      >
                        Clear all
                      </Button>
                    )}
                  </div>
                </div>
                <div className="max-h-80 overflow-auto">
                  {notifications.length > 0 ? (
                    <div>
                      {notifications.map((notification) => (
                        <div 
                          key={notification.id} 
                          className={`px-4 py-3 ${!notification.read ? 'bg-accent/20' : ''} ${notification.id !== notifications[notifications.length-1].id ? 'border-b' : ''}`}
                        >
                          <h4 className="text-sm font-medium">{notification.title}</h4>
                          <p className="text-xs text-muted-foreground">{notification.message}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{notification.time}</p>
                          
                          {/* Add accept/reject buttons for invitations */}
                          {notification.type === 'invitation' && (
                            <div className="mt-2 flex gap-2">
                              <Button 
                                size="sm" 
                                variant="default" 
                                className="h-7 text-xs px-2 py-0"
                                onClick={() => handleAcceptInvitation(notification.memberId, notification.id)}
                              >
                                Accept
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 text-xs px-2 py-0"
                                onClick={() => handleRejectInvitation(notification.memberId, notification.id)}
                              >
                                Decline
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                      <Bell className="h-8 w-8 text-muted-foreground/50 mb-2" />
                      <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        You'll receive notifications when someone invites you to a team or when team events occur.
                      </p>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            
            {activeTab === 'teams' ? (
              <Button 
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center gap-1"
              >
                <PlusCircle className="h-4 w-4" />
                Create Team
              </Button>
            ) : (
              <Button 
                onClick={() => setShowAddMemberForm(true)}
                className="flex items-center gap-1"
              >
                <UserPlus className="h-4 w-4" />
                Add Members
              </Button>
            )}
          </div>
        </div>
      </header>
      
      {/* Add Member Dialog */}
      <Dialog open={showAddMemberForm} onOpenChange={setShowAddMemberForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Invite a new member to join your team by email
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAddMember} className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                An invitation will be sent to this email address
              </p>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => setShowAddMemberForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Send Invitation</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create a New Team</CardTitle>
            <CardDescription>Set up a new team for collaboration</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateTeamForm 
              onSubmit={handleCreateTeam} 
              onCancel={() => setShowCreateForm(false)} 
            />
          </CardContent>
        </Card>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="teams">Browse Teams</TabsTrigger>
          <TabsTrigger value="members">Team Members</TabsTrigger>
          <TabsTrigger value="shared">Shared Conversations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="teams" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <Input 
                placeholder="Search teams..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-md border border-input w-full sm:w-auto"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTeams.map(team => (
              <Card key={team.id} className="overflow-hidden border border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`${team.avatarColor} h-10 w-10 rounded-md flex items-center justify-center text-white font-semibold`}>
                      {team.name.charAt(0)}
                    </div>
                    <div>
                      <CardTitle 
                        className="text-xl cursor-pointer hover:text-primary transition-colors"
                        onClick={() => {
                          if (isInMyTeam(team.id)) {
                            handleOpenTeamChat(team);
                          } else {
                            // Show toast for non-members
                            toast("Join team to chat", {
                              description: "You need to join this team to access the chat."
                            });
                          }
                        }}
                      >
                        {team.name}
                      </CardTitle>
                      <CardDescription>{team.category}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <p className="text-sm text-muted-foreground">{team.description}</p>
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Members ({team.members.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {team.members.slice(0, 3).map((member) => (
                        <TooltipProvider key={member.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative">
                                {member.avatar ? (
                                  <img 
                                    src={member.avatar} 
                                    alt={member.name}
                                    className="h-8 w-8 rounded-full border border-border"
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
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{member.name}</p>
                              <p className="text-xs text-muted-foreground">{member.role}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                      {team.members.length > 3 && (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-xs font-medium">+{team.members.length - 3}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-2">
                  {isInMyTeam(team.id) ? (
                    <>
                      <Button 
                        variant="outline" 
                        onClick={() => handleLeaveTeam(team.id)}
                        className="flex items-center gap-2"
                      >
                        <UserMinus className="h-4 w-4" />
                        Leave
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setActiveTeamId(team.id);
                          setShowShareDialog(true);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Share2 className="h-4 w-4" />
                        Share Conversation
                      </Button>
                    </>
                  ) : (
                    <Button 
                      onClick={() => handleJoinTeam(team.id)}
                      className="flex items-center gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      Join Team
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
          
          {filteredTeams.length === 0 && (
            <div className="col-span-full text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">No teams found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search or create a new team</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="members">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {teamMembersList.map(member => (
              <TeamMemberCard 
                key={member.id} 
                member={member} 
                onRemove={handleRemoveTeamMember}
              />
            ))}
            
            {teamMembersList.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <h3 className="text-lg font-medium">No team members</h3>
                <p className="text-sm text-muted-foreground">
                  Click "Add Members" above to invite people to your team
                </p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="shared" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Shared Conversations</h2>
          </div>
          
          {myTeams.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <Users className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Teams Joined</h3>
                <p className="text-muted-foreground max-w-md">
                  Join or create a team to see shared conversations.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {myTeams.map((team) => {
                const teamSharedConversations = getTeamSharedConversations(team.id);
                
                return (
                  <div key={team.id}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center">
                        <div className={`${team.avatarColor} h-6 w-6 rounded-md flex items-center justify-center text-white font-semibold mr-2`}>
                          {team.name.charAt(0)}
                        </div>
                        {team.name}
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveTeamId(team.id);
                          setShowShareDialog(true);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Share with Team
                      </Button>
                    </div>
                    
                    {teamSharedConversations.length === 0 ? (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                          <MessageSquare className="h-8 w-8 text-muted-foreground mb-3" />
                          <h4 className="text-base font-medium mb-2">No Conversations Shared</h4>
                          <p className="text-sm text-muted-foreground max-w-md">
                            No one has shared any conversations with this team yet.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {teamSharedConversations.map((conversation) => (
                          <SharedConversationCard 
                            key={conversation.id} 
                            conversation={conversation}
                            onView={handleViewSharedConversation}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Share Conversation Dialog */}
      <ShareConversationDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        onShare={handleShareConversation}
        teamId={activeTeamId}
      />
    </div>
  );
}
