"use client";

import React, { useState, useEffect } from 'react';
import { Mail, MessageSquare, Users, UserPlus, UserMinus, PlusCircle, Bell, Share2, Upload, ArrowLeft, MoreHorizontal, Search, Send, Paperclip, Image, Smile } from 'lucide-react';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { getAllConversationsMetadata } from '@/lib/storage';
import { useChat } from '@/context/chat-context';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from "@/lib/supabase";

// Extended team member data with more information
interface ExtendedTeamMember {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  lastSeen?: string;
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

const teamMembers: ExtendedTeamMember[] = [];

// Initial teams data
const initialTeams: Team[] = [
  {
    id: "team1",
    name: "Frontend Squad",
    description: "Responsible for UI/UX implementation and frontend development",
    members: [], 
    avatarColor: "bg-blue-500",
    category: "Development",
  },
  {
    id: "team2",
    name: "Backend Heroes",
    description: "Handling server-side logic and database architecture",
    members: [],
    avatarColor: "bg-green-500",
    category: "Development",
  },
  {
    id: "team3",
    name: "Project Management",
    description: "Overseeing project timelines and coordination",
    members: [],
    avatarColor: "bg-purple-500",
    category: "Management",
  },
  {
    id: "team4",
    name: "Design Wizards",
    description: "Creating beautiful and intuitive user experiences",
    members: [],
    avatarColor: "bg-amber-500",
    category: "Design",
  },
  {
    id: "team5",
    name: "Full Stack Force",
    description: "End-to-end development across the stack",
    members: [],
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

// Replace the TeamChatView component with a full-page version
function TeamChatView({
  activeTeam,
  memberID,
  userInfo,
  onClose,
  onInvite,
  membersList
}: {
  activeTeam: Team | null;
  memberID: string;
  userInfo: { name: string; email: string; avatar: string };
  onClose: () => void;
  onInvite: (email: string) => void;
  membersList: ExtendedTeamMember[];
}) {
  const [message, setMessage] = useState('');
  const [teamMessages, setTeamMessages] = useState<TeamMessage[]>([]);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [showMembersList, setShowMembersList] = useState(false);

  // Load messages when team changes
  useEffect(() => {
    if (activeTeam) {
      // Get stored messages for this team
      if (typeof window !== 'undefined') {
        try {
          const savedMessages = localStorage.getItem(`team_chat_${activeTeam.id}`);
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
  }, [activeTeam]);

  // Save messages when they change
  useEffect(() => {
    if (activeTeam && teamMessages.length > 0) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`team_chat_${activeTeam.id}`, JSON.stringify(teamMessages));
        } catch (error) {
          console.error("Failed to save team messages", error);
        }
      }
    }
  }, [teamMessages, activeTeam]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [teamMessages]);

  // Update handleSendMessage
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !activeTeam) return;
    
    // Create new message
    const newMessage: TeamMessage = {
      id: `msg-${Date.now()}`,
      teamId: activeTeam.id,
      senderId: memberID,
      senderName: userInfo.name,
      senderAvatar: userInfo.avatar,
      content: message,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    
    // Add to messages
    setTeamMessages(prev => [...prev, newMessage]);
    
    // Clear input
    setMessage('');
  };

  // Handle adding a member from chat view
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newMemberEmail.trim() && newMemberEmail.includes('@')) {
      // Call parent component's add member function
      onInvite(newMemberEmail);
      
      // Clear input and close dialog
      setNewMemberEmail('');
      setShowAddMemberDialog(false);
    }
  };

  return (
    <div className="container h-screen flex flex-col">
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
            size="sm" 
            onClick={onClose}
          className="mr-2"
        >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
          <h2 className="text-xl font-semibold">{activeTeam?.name || 'Team Chat'}</h2>
          </div>
        
        {/* Chat conversation area */}
        <div className="flex items-center gap-2">
                  <Button 
            variant="outline"
            size="sm" 
            onClick={() => setShowAddMemberDialog(true)}
          >
            <UserPlus className="h-4 w-4 mr-1" /> Add Member
                  </Button>
        </div>
      </div>
      
      {/* Chat conversation area */}
      <div className="flex-1 overflow-auto p-4">
        {teamMessages.map((msg) => (
                  <div 
                    key={msg.id} 
            className={`mb-4 max-w-[80%] ${msg.senderId === memberID ? 'ml-auto' : ''}`}
          >
            <div className={`rounded-lg p-3 ${
              msg.senderId === memberID 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted'
            }`}>
              {msg.content}
                          </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center">
              {msg.senderId !== memberID && (
                <span className="font-medium mr-2">{msg.senderName}</span>
                        )}
              <span>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                        </div>
        ))}
        <div ref={messagesEndRef}></div>
      </div>
      
      {/* Message input area */}
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
          className="flex-1"
          />
          <Button type="submit">Send</Button>
      </form>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Select an existing team member to add to this team
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 max-h-[60vh] overflow-auto">
            {teamMembers.length === 0 ? (
              <div className="text-center py-6">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="font-medium">No team members available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add team members from the main Teams page first
              </p>
            </div>
            ) : teamMembers.filter(member => 
              !activeTeam?.members.some(teamMember => teamMember.id === member.id)
            ).length > 0 ? (
              <div className="space-y-2">
                {teamMembers.filter(member => 
                  !activeTeam?.members.some(teamMember => teamMember.id === member.id)
                ).map(member => (
                  <div 
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-accent cursor-pointer"
                    onClick={() => {
                      onInvite(member.email);
                      setShowAddMemberDialog(false);
                    }}
                  >
                  <div className="flex items-center gap-3">
                    {member.avatar ? (
                      <img 
                        src={member.avatar} 
                        alt={member.name}
                        className="h-10 w-10 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-medium">{member.name.charAt(0)}</span>
                      </div>
                    )}
                    <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                    <Button variant="ghost" size="sm" className="rounded-full">
                      <UserPlus className="h-4 w-4" />
                      </Button>
                </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="font-medium">No available members</p>
                <p className="text-sm text-muted-foreground mt-1">
                  All team members have already been added to this team
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAddMemberDialog(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState('teams');
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [myTeams, setMyTeams] = useState<Team[]>([]); // No initial joined teams
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  
  // Add state for email invitation dialog
  const [showEmailInviteDialog, setShowEmailInviteDialog] = useState(false);
  const [pendingInviteEmail, setPendingInviteEmail] = useState('');
  
  // Initialize teamMembersList state
  const [teamMembersList, setTeamMembersList] = useState<ExtendedTeamMember[]>(teamMembers);
  
  // Add missing state variables for sharing functionality
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [activeTeamId, setActiveTeamId] = useState<string>('');
  
  // Initialize notifications state
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedNotifications = localStorage.getItem('notifications');
        if (savedNotifications) return JSON.parse(savedNotifications);
      } catch (error) {
        console.error("Failed to load notifications", error);
      }
    }
    return [];
  });
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
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
  
  // Function to handle removing a team member
  const handleRemoveTeamMember = (memberId: string) => {
    setTeamMembersList(prevMembers => prevMembers.filter(member => member.id !== memberId));
    
    // Add notification for removal
    const newNotification: InfoNotification = {
      id: `member-removed-${Date.now()}`,
      title: "Team Member Removed",
      message: `A team member has been removed`,
      time: "Just now",
      read: false,
      type: "info"
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    toast.success("Team member removed", {
      description: "The team member has been successfully removed",
    });
  };
  
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
  
  // Function to add invitation notification
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
      type: 'invitation',
      memberId: memberId,
      teamName: teamName
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  };

  // Add this function to handle opening the team chat
  const handleOpenTeamChat = (team: Team) => {
    setActiveChatTeam(team);
  };

  // Add function to close the chat view
  const handleCloseTeamChat = () => {
    setActiveChatTeam(null);
  };

  // Add function to handle adding a team member from the chat view
  const handleAddMemberFromChat = (emailOrName: string) => {
    if (emailOrName.trim() && emailOrName.includes('@') && activeChatTeam) {
      // Call the main handleAddMember function with a synthetic form event
      const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
      setNewMemberEmail(emailOrName);
      
      // Call the main add member function which will handle Supabase checks
      setTimeout(() => {
        handleAddMember(syntheticEvent);
      }, 0);
    }
  };

  // Update handleAddMember to use custom AlertDialog instead of browser confirm
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that we have an email
    if (!newMemberEmail || !newMemberEmail.trim()) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Create loading toast
    const loadingToastId = toast.loading("Checking if the user exists in our system");

    try {
      // Check if the email exists in the Supabase users table
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', newMemberEmail.trim())
        .maybeSingle();

      // Remove loading toast
      toast.dismiss(loadingToastId);

      if (error) {
        throw error;
      }

      if (data) {
        // User exists in Supabase, add as team member with proper data
        const newMember: ExtendedTeamMember = {
          id: `member-${Date.now()}`,
          name: data.full_name || data.email.split('@')[0],
          avatar: data.avatar_url || '',
          email: data.email,
          role: 'Team Member',
          bio: '',
          isOnline: false,
          lastSeen: new Date().toISOString(),
          pending: false
        };

        // Update team members list
        setTeamMembersList(prevMembers => [...prevMembers, newMember]);
        
        // Add notification for the sender
        toast.success(`${newMember.name} has been added to your team.`);

        // Add notification for the person who was added
        addInvitationNotification(newMember.email);

      } else {
        // User doesn't exist in Supabase, show custom confirmation
        if (window.confirm(`${newMemberEmail} doesn't have an account yet. Would you like to send them an email invitation?`)) {
          setPendingInviteEmail(newMemberEmail);
          setShowEmailInviteDialog(true);
        }
      }
      } catch (error) {
      // Remove loading toast
      toast.dismiss(loadingToastId);
      
      // Show error toast
      toast.error("There was an error checking this email. Please try again.");
      console.error("Error checking email:", error);
    }

    // Clear the input
    setNewMemberEmail('');
  };

  // Handler for sending email invitation
  const handleSendEmailInvitation = () => {
    if (pendingInviteEmail) {
      // Create placeholder member (will only be visible to the sender)
      const newMember: ExtendedTeamMember = {
        id: `member-${Date.now()}`,
        name: pendingInviteEmail.split('@')[0],
        email: pendingInviteEmail,
        isOnline: false,
        role: "New Member",
        lastSeen: "Just invited",
        avatar: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 20) + 1}`,
        bio: "Invited via email",
        pending: true
      };
      
      // Add the new member to the list
      setTeamMembersList(prevMembers => [...prevMembers, newMember]);
      
      // Add notification for the sender
      addInvitationNotification(pendingInviteEmail);
      
      toast.success("Email invitation sent", {
        description: `${pendingInviteEmail} has been invited to join via email`,
        action: {
          label: "Undo",
          onClick: () => {
            // Remove the newly added member
      setTeamMembersList(prevMembers => 
              prevMembers.filter((m: ExtendedTeamMember) => m.id !== newMember.id)
            );
            console.log("Undoing invitation to", pendingInviteEmail);
          },
        },
      });
      
      // Reset state
      setPendingInviteEmail('');
      setShowEmailInviteDialog(false);
    }
  };
  
  // Functions for team conversation sharing
  const getTeamSharedConversations = (teamId: string): SharedConversation[] => {
    // In a real application, this would fetch from a database
    // For now, just return mock data based on the team ID
    return [
      {
        id: `shared-${teamId}-1`,
        conversationId: `conv-${teamId}-1`,
        title: "Project Planning Discussion",
        sharedBy: "Team Member",
        sharedAt: "2 days ago",
        message: "Important notes about our upcoming project timeline",
        teamId: teamId
      },
      {
        id: `shared-${teamId}-2`,
        conversationId: `conv-${teamId}-2`,
        title: "Client Meeting Notes",
        sharedBy: "Team Lead",
        sharedAt: "5 days ago",
        message: "Summary of client requirements and feedback",
        teamId: teamId
      }
    ];
  };

  const handleShareConversation = (conversationId: string, message: string, teamId: string) => {
    toast.success("Conversation shared with team", {
      description: "Team members will now be able to view this conversation",
    });
    setShowShareDialog(false);
  };

  const handleViewSharedConversation = (conversationId: string) => {
    toast.info("Opening shared conversation", {
      description: "This would open the shared conversation",
    });
    // In a real application, this would navigate to the conversation view
    console.log("Opening conversation:", conversationId);
  };

  // If a team chat is active, show the chat view instead of the regular content
  if (activeChatTeam) {
    return (
      <div className="container py-0 px-0 max-w-full h-screen team-page">
        <TeamChatView 
          activeTeam={activeChatTeam}
          memberID={currentUserId}
          userInfo={userData}
          onClose={handleCloseTeamChat}
          onInvite={handleAddMemberFromChat}
          membersList={teamMembersList}
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
                                onClick={() => {
                                  // Find the member in our list
                                  const memberId = (notification as InvitationNotification).memberId;
                                  const member = teamMembersList.find((m) => m.id === memberId);
                                  
                                  if (member) {
                                    // Update the member's pending status
                                    setTeamMembersList(prevMembers => prevMembers.map(m => 
                                      m.id === memberId ? { ...m, pending: false } : m
                                    ));
                                    
                                    // Remove this notification
                                    setNotifications(prevNotifications => 
                                      prevNotifications.filter(n => n.id !== notification.id)
                                    );
                                    
                                    // Add a success notification
                                    const successNotification: InfoNotification = {
                                      id: `accepted-${Date.now()}`,
                                      title: "Invitation Accepted",
                                      message: `You have joined ${(notification as InvitationNotification).teamName}`,
                                      time: "Just now",
                                      read: false,
                                      type: "info"
                                    };
                                    
                                    setNotifications(prevNotifications => 
                                      [successNotification, ...prevNotifications]
                                    );
                                  }
                                }}
                              >
                                Accept
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => {
                                  const memberId = (notification as InvitationNotification).memberId;
                                  
                                  // Remove the member from the list
                                  setTeamMembersList(prevMembers => 
                                    prevMembers.filter((m) => m.id !== memberId)
                                  );
                                  
                                  // Remove this notification
                                  setNotifications(prevNotifications => 
                                    prevNotifications.filter(n => n.id !== notification.id)
                                  );
                                  
                                  // Add a rejection notification
                                  const rejectionNotification: InfoNotification = {
                                    id: `rejected-${Date.now()}`,
                                    title: "Invitation Declined",
                                    message: `You declined to join ${(notification as InvitationNotification).teamName}`,
                                    time: "Just now",
                                    read: false,
                                    type: "info"
                                  };
                                  
                                  setNotifications(prevNotifications => 
                                    [rejectionNotification, ...prevNotifications]
                                  );
                                }}
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
                <h3 className="text-base font-medium mb-2">No Teams Joined</h3>
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

      {/* Email Invitation Dialog */}
      <Dialog open={showEmailInviteDialog} onOpenChange={setShowEmailInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Email Invitation</DialogTitle>
            <DialogDescription>
              {pendingInviteEmail} doesn't have an account yet. Send them an email invitation to join your team.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-muted p-4 rounded-md mb-4">
              <p className="text-sm font-medium mb-2">Email Preview:</p>
              <div className="border rounded-md p-3 bg-card">
                <p className="text-sm mb-2"><strong>To:</strong> {pendingInviteEmail}</p>
                <p className="text-sm mb-2"><strong>Subject:</strong> You've been invited to join a team</p>
                <div className="border-t pt-2 mt-2">
                  <p className="text-sm mb-2">Hi there,</p>
                  <p className="text-sm mb-2">
                    You've been invited to join a team on our platform. Click the link below to join:
                  </p>
                  <div className="bg-primary/10 text-primary p-2 rounded text-sm font-medium my-2 text-center">
                    [Invitation Link]
                  </div>
                  <p className="text-sm">
                    If you don't have an account yet, you'll be able to create one.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowEmailInviteDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                // Send email invitation logic would go here
                toast.success(`Invitation email sent to ${pendingInviteEmail}`);
                
                // Create pending team member
                const newMember: ExtendedTeamMember = {
                  id: `pending-${Date.now()}`,
                  name: pendingInviteEmail.split('@')[0],
                  email: pendingInviteEmail,
                  avatar: '',
                  role: 'Pending Member',
                  bio: '',
                  isOnline: false,
                  lastSeen: 'Invited',
                  pending: true
                };
                
                // Add to team members list
                setTeamMembersList(prevMembers => [...prevMembers, newMember]);
                
                // Reset and close dialog
                setPendingInviteEmail('');
                setShowEmailInviteDialog(false);
              }}
            >
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
