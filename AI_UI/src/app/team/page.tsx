"use client";

import React, { useState, useEffect } from 'react';
import { Mail, MessageSquare, Users, UserPlus, UserMinus, PlusCircle, Bell, Check } from 'lucide-react';
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

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState('teams');
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [myTeams, setMyTeams] = useState<Team[]>([teams[0], teams[2]]); // Initial joined teams
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  
  // Add a state to track client-side hydration
  const [isClient, setIsClient] = useState(false);
  
  // Set isClient to true after component mounts (client-side only)
  useEffect(() => {
    setIsClient(true);
  }, []);
  
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
  
  // Add a function to mark a single notification as read
  const markAsRead = (notificationId: string) => {
    setNotifications(prevNotifications => 
      prevNotifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };
  
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
                  {isClient && unreadCount > 0 && (
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
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-medium">{notification.title}</h4>
                              <p className="text-xs text-muted-foreground">{notification.message}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{notification.time}</p>
                            </div>
                            {!notification.read && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                                onClick={() => markAsRead(notification.id)}
                                title="Mark as read"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span className="sr-only">Mark as read</span>
                              </Button>
                            )}
                          </div>
                          
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
              <TeamCard 
                key={team.id} 
                team={team} 
                onJoin={handleJoinTeam}
                onLeave={handleLeaveTeam}
                isMember={isInMyTeam(team.id)}
              />
            ))}
            
            {filteredTeams.length === 0 && (
              <div className="col-span-full text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <h3 className="text-lg font-medium">No teams found</h3>
                <p className="text-sm text-muted-foreground">Try adjusting your search or create a new team</p>
              </div>
            )}
          </div>
          
          {myTeams.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-4">My Teams</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {myTeams.map(team => (
                  <TeamCard 
                    key={team.id} 
                    team={team} 
                    onJoin={handleJoinTeam}
                    onLeave={handleLeaveTeam}
                    isMember={true}
                  />
        ))}
      </div>
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
      </Tabs>
    </div>
  );
} 