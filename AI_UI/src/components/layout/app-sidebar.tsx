"use client"

import * as React from "react"
import {
  ArrowUpCircle,
  BarChart,
  Camera,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  DatabaseIcon,
  FileCode,
  File,
  FileText,
  Folder,
  HelpCircle,
  History,
  LayoutDashboard,
  List,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  Search,
  Settings,
  Trash2,
  Users,
  UserPlus,
  UserMinus,
  Mail,
  LogOut,
  X,
  Zap,
  Activity,
  Plus,
  Tag,
  Crown,
  Pencil,
  Share2,
  MoreVertical,
  Code
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

import { NavDocuments } from "./nav-documents"
import { NavMain } from "./nav-main"
import { NavSecondary } from "./nav-secondary"
import { NavUser } from "./nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton
} from "@/components/blocks/sidebar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useChat } from "@/context/chat-context"
import { getAllConversationsMetadataSync as getAllConversationsMetadata, saveConversationMetadata, getConversationMetadata } from "@/lib/storage"
import { getAllProjectsAsync } from "@/lib/projects/storage"
import { Project } from "@/lib/projects/types"
import { useLanguage } from "@/context/language-context"


function getUserData() {
  if (typeof window === 'undefined') {
    return {
      name: "User",
      email: "user@example.com",
      avatar: "",
    };
  }

  try {

    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');


    if (userData && userData.name) {
      return {
        name: userData.name || "User",
        email: userData.email || "user@example.com",
        avatar: userData.avatar || "",
      };
    }

    // Fallback to auth info if available
    if (localStorage.getItem('authenticated') === 'true') {
      // Get user initials from URL if available
      const urlParams = new URLSearchParams(window.location.search);
      const userName = urlParams.get('user_name') || localStorage.getItem('user_name') || "User";
      const userEmail = urlParams.get('user_email') || localStorage.getItem('user_email') || "user@example.com";
      const userAvatar = urlParams.get('user_avatar') || localStorage.getItem('user_avatar') || "";

      return {
        name: userName,
        email: userEmail,
        avatar: userAvatar,
      };
    }

    // Default fallback
    return {
      name: "User",
      email: "user@example.com",
      avatar: "",
    };
  } catch (error) {
    console.error("Error parsing user data:", error);
    return {
      name: "User",
      email: "user@example.com",
      avatar: "",
    };
  }
}


interface Friend {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
}

const data = {
  user: getUserData(),
  navMain: [
    {
      title: "Chat",
      url: "/AI_UI",
      icon: MessageSquare,
    },
    {
      title: "Compiler",
      url: "/compiler",
      icon: Code,
    },
    {
      title: "Teams",
      url: "/team",
      icon: Users,
    },
    {
      title: "Projects",
      url: "/projects",
      icon: Folder,
    }
  ],
  navClouds: [
    {
      title: "Capture",
      icon: Camera,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: FileText,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: FileCode,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/examples/forms",
      icon: Settings,
    },
    {
      title: "Terms & Conditions",
      url: "/terms",
      icon: HelpCircle,
    },
  ],
  documents: [],
}

// Add initial friends data
const initialFriends: Friend[] = [];

export function AppSidebar({ className, ...props }: React.ComponentPropsWithoutRef<typeof Sidebar>) {
  const [conversationsExpanded, setConversationsExpanded] = React.useState(false);
  const [teamsExpanded, setTeamsExpanded] = React.useState(false);
  const [projectsExpanded, setProjectsExpanded] = React.useState(false);
  const [expandedProjectId, setExpandedProjectId] = React.useState<string | null>(null);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [friends, setFriends] = React.useState<Friend[]>(() => {
    // Initialize from localStorage if available, otherwise use empty array
    if (typeof window !== 'undefined') {
      try {
        const savedFriends = localStorage.getItem('sidebar_friends');
        if (savedFriends) {
          return JSON.parse(savedFriends);
        }
      } catch (error) {
        console.error("Failed to load friends from localStorage", error);
      }
    }
    return initialFriends;
  });
  const [showAddFriend, setShowAddFriend] = React.useState(false);
  const [newFriendName, setNewFriendName] = React.useState("");
  const [conversations, setConversations] = React.useState<any[]>([]);
  const [allConversations, setAllConversations] = React.useState<any[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [activePath, setActivePath] = React.useState('');
  const pathname = usePathname();
  const { conversationId, switchConversation, startNewConversation, deleteCurrentConversation } = useChat();
  const router = useRouter();
  const { t } = useLanguage();

  // Project dialogs state
  const [projectToDelete, setProjectToDelete] = React.useState<Project | null>(null);
  const [showDeleteProjectDialog, setShowDeleteProjectDialog] = React.useState(false);
  const [projectToRename, setProjectToRename] = React.useState<Project | null>(null);
  const [showRenameProjectDialog, setShowRenameProjectDialog] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState('');
  const [showNewProjectDialog, setShowNewProjectDialog] = React.useState(false);
  const [newProjectInput, setNewProjectInput] = React.useState('');

  // Handle conversation switching with navigation
  const handleSwitchConversation = (id: string) => {
    switchConversation(id);

    // If not on the main chat page, navigate to it
    if (pathname !== '/AI_UI') {
      router.push('/AI_UI');
    }
  };

  const handleStartNewConversation = () => {
    startNewConversation();
    if (pathname !== '/AI_UI') {
      router.push('/AI_UI');
    }
  };

  // Use default empty values for initial server-side rendering
  const [userData, setUserData] = React.useState({
    name: "User",
    email: "user@example.com",
    avatar: "",
  });

  // Flag to track if component is mounted (client-side only)
  const [isMounted, setIsMounted] = React.useState(false);

  // Add state for editing conversation title
  const [editingConversationId, setEditingConversationId] = React.useState<string | null>(null);
  const [newConversationTitle, setNewConversationTitle] = React.useState("");

  // Simple modal state instead of AlertDialog
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [conversationToDelete, setConversationToDelete] = React.useState<{ id: string, title: string } | null>(null);

  // Function to toggle sidebar collapse state
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
    // Add a class to the body to allow the main content to shift
    if (!sidebarCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  };

  // Set mounted flag on first render
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Add state for visible items
  const [visibleItems, setVisibleItems] = React.useState<string[]>(["chat", "compiler", "teams", "projects"]);

  // Refresh user data - only run on client side after component is mounted
  React.useEffect(() => {
    if (isMounted) {
      const refreshUserData = () => {
        setUserData(getUserData());
      };

      const loadVisibleItems = () => {
        const savedItems = localStorage.getItem("sidebar_preferences");
        if (savedItems) {
          try {
            setVisibleItems(JSON.parse(savedItems));
          } catch (e) {
            console.error("Failed to parse sidebar preferences", e);
          }
        }
      };

      // Refresh on mount
      refreshUserData();
      loadVisibleItems();

      // Set up event listener to refresh user data when authentication changes
      window.addEventListener('storage', (event) => {
        if (event.key === 'authenticated' ||
          event.key === 'user_data' ||
          event.key === 'user_name' ||
          event.key === 'user_email' ||
          event.key === 'user_avatar') {
          refreshUserData();
        }
        if (event.key === 'sidebar_preferences' || event.type === 'storage') {
          // Note: event.key is null for manually dispatched events in some browsers/contexts, 
          // but we can just reload on any storage event to be safe, or check specific keys.
          // For the custom dispatch in display-form, we might not get a key if we just did new Event('storage').
          loadVisibleItems();
        }
      });
    }
  }, [isMounted]);

  // Load conversations - only on client side after mounting
  // Uses event-driven updates instead of polling (like ChatGPT/Gemini)
  React.useEffect(() => {
    if (isMounted) {
      const loadConversations = async () => {
        const fetchedConversations = await getAllConversationsMetadata();

        // Store all conversations for project display
        setAllConversations(fetchedConversations);

        // Filter out conversations that belong to projects (have a project_id) for main list
        const filteredConversations = fetchedConversations.filter((c: any) => !c.projectId);
        setConversations(filteredConversations);
      };

      // Load once on mount only
      loadConversations();

      // Listen for custom events when conversations are updated
      const handleConversationUpdate = () => loadConversations();
      window.addEventListener('conversationUpdated', handleConversationUpdate);

      return () => {
        window.removeEventListener('conversationUpdated', handleConversationUpdate);
      };
    }
  }, [isMounted]);


  React.useEffect(() => {
    if (isMounted) {
      const loadProjects = async () => {
        const allProjects = await getAllProjectsAsync();
        setProjects(allProjects);
      };

      loadProjects();

      // Listen for project updates
      const handleProjectUpdate = () => loadProjects();
      window.addEventListener('projectUpdated', handleProjectUpdate);

      return () => {
        window.removeEventListener('projectUpdated', handleProjectUpdate);
      };
    }
  }, [isMounted]);

  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return 'Unknown date';
    }
  };

  // Track active path from Next.js router pathname so Chat doesn't stay highlighted
  React.useEffect(() => {
    if (!pathname) return;
    // Normalize to known main routes when applicable; otherwise use exact pathname
    if (pathname.startsWith('/team')) {
      setActivePath('/team');
      return;
    }
    const matchingItem = data.navMain.find(
      (item) => pathname === item.url || (item.url !== '/' && pathname.startsWith(item.url))
    );
    if (matchingItem) {
      setActivePath(matchingItem.url);
    } else {
      setActivePath(pathname);
    }
  }, [pathname]);


  React.useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      body {
        --sidebar-width: 200px !important;
        --sidebar-collapsed-width: 0px;
      }
      
      .sidebar-container {
        transition: grid-template-columns 0.3s ease;
      }
      
      body.sidebar-collapsed .sidebar-container {
        grid-template-columns: 80px 1fr !important;
        padding-left: 0;
      }
      
      /* Force sidebar width */
      [data-slot="sidebar"],
      [data-sidebar="true"],
      .sidebar-wrapper,
      aside[role="navigation"] {
        width: 200px !important;
        min-width: 200px !important;
        max-width: 200px !important;
        transition: transform 0.3s ease, opacity 0.3s ease, visibility 0.3s ease;
        overflow-x: hidden;
      }
      
      body.sidebar-collapsed [data-slot="sidebar"] {
        opacity: 0;
        visibility: hidden;
        width: 0 !important;
        min-width: 0 !important;
        max-width: 0 !important;
        overflow: hidden;
        transform: translateX(-100%);
      }
      
      body.sidebar-collapsed main {
        width: 100%;
        padding-left: 80px;
      }
      
      /* Footer should not block animated background */
      [data-sidebar="footer"] {
        position: relative;
        z-index: 10;
        margin-top: auto;
        background-color: transparent !important;
        border-top: 1px solid var(--border);
        padding: 12px;
        width: 100%;
      }
      
      /* Fix for user profile area */
      [data-slot="nav-user"] {
        width: 100%;
        max-width: 100%;
      }

      /* Additional fix to prevent any black overlays */
      .app-layout::after {
        display: none !important;
      }
      
      .sidebar-toggle-btn {
        position: fixed;
        top: 1.5rem;
        left: 1.5rem;
        z-index: 100;
        background-color: var(--background);
        border: 1px solid var(--border);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s ease, left 0.3s ease;
        cursor: pointer;
      }
      
      body:not(.sidebar-collapsed) .sidebar-toggle-btn {
        left: 160px; /* Position near the end of the sidebar */
      }
      
      /* Fix for chat interface positioning */
      .chat-interface {
        margin-left: 0 !important;
        width: 100% !important;
        max-width: calc(100% - 10px) !important;
        padding-left: 0 !important;
      }
      
      /* Team sections specific adjustments */
      body.sidebar-collapsed .team-page {
        margin-left: 0;
        padding-left: 60px;
      }
      
      /* Use default component focus styles; no custom outlines here to match other buttons */
      
      /* Fix for active state in Chat button */
      [data-slot="sidebar-menu-button"][data-active="true"] a {
        background-color: var(--accent);
        color: var(--accent-foreground);
      }
      
      /* Fix for cursor types in sidebar */
      [data-slot="sidebar"] a,
      [data-slot="sidebar"] button,
      [data-slot="sidebar"] [role="button"],
      [data-slot="sidebar-menu-button"],
      [data-slot="sidebar-menu-sub-button"],
      [data-slot="sidebar-menu"] a,
      [data-slot="sidebar-menu"] button,
      [data-slot="sidebar-menu-sub"] a,
      [data-slot="sidebar-menu-item"] a,
      [data-slot="sidebar-menu-sub-item"] a {
        cursor: pointer !important;
      }
      
      /* Ensure text within elements has text cursor */
      [data-slot="sidebar"] a *,
      [data-slot="sidebar"] button *,
      [data-slot="sidebar"] [role="button"] * {
        cursor: inherit;
      }
      
      @media (max-width: 1024px) {
        .sidebar-toggle-btn {
          display: none;
        }
      }
    `;
    document.head.appendChild(styleEl);

    return () => {
      document.head.removeChild(styleEl);
      document.body.classList.remove('sidebar-collapsed');
    };
  }, []);

  // Function to add a new friend
  const handleAddFriend = () => {
    if (newFriendName.trim()) {
      const newFriend: Friend = {
        id: `friend-${Date.now()}`,
        name: newFriendName,
        isOnline: true,
      };
      setFriends([...friends, newFriend]);
      setNewFriendName("");
      setShowAddFriend(false);
    }
  };

  // Function to remove a friend
  const handleRemoveFriend = (id: string) => {
    setFriends(friends.filter(friend => friend.id !== id));
  };

  // Save friends to localStorage whenever they change
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sidebar_friends', JSON.stringify(friends));
      } catch (error) {
        console.error("Failed to save friends to localStorage", error);
      }
    }
  }, [friends]);

  const handleRenameConversation = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) {
      setEditingConversationId(null);
      return;
    }

    const allConversations = await getAllConversationsMetadata();


    const conversationToUpdate = allConversations.find((c: { id: string }) => c.id === id);

    if (conversationToUpdate) {

      const existingMeta = await getConversationMetadata(id) || {
        title: `Conversation ${id.substring(0, 6)}`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      };

      // Update metadata with new title and timestamp
      const updatedMeta = {
        ...existingMeta,
        title: newTitle,
        updated: new Date().toISOString()
      };

      // Save updated metadata
      saveConversationMetadata(id, updatedMeta);

      // Force update conversations list to reflect the change
      const updatedConversations = await getAllConversationsMetadata();
      setConversations(updatedConversations);
    }

    // Reset editing state
    setEditingConversationId(null);
  };

  const handleShareConversation = (id: string) => {

    navigator.clipboard.writeText(`${window.location.origin}?conversation=${id}`)
      .then(() => {
        alert('Conversation link copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };


  const handleDeleteRequest = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setConversationToDelete({ id, title });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      try {
        deleteCurrentConversation();
      } catch (error) {
        console.error("Error deleting conversation:", error);
      }
    }

    setShowDeleteModal(false);
    setConversationToDelete(null);
  };


  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setConversationToDelete(null);
  };

  return (
    <>
      <div
        className={cn(
          "app-layout grid",
          sidebarCollapsed ? "grid-template-columns: 80px 1fr sidebar-collapsed" : "grid-template-columns: 200px 1fr",
          "transition-all duration-300 ease-in-out",
          { "sidebar-collapsed": sidebarCollapsed }
        )}
      >
        <Sidebar
          collapsible={sidebarCollapsed ? "none" : "offcanvas"}
          className={cn(
            "transition-all duration-300",
            sidebarCollapsed ? "opacity-0 invisible" : "opacity-100 visible",
            className
          )}
          style={{
            width: '200px',
            minWidth: '200px',
            maxWidth: '200px',
            overflow: 'hidden',
            borderRight: '1px solid rgba(255, 255, 255, 0.2)'
          }}
          {...props}
        >
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
                  <Link href="/AI_UI" className="focus:outline-none">
                    <ArrowUpCircle className="h-5 w-5" />
                    <span className="text-base font-semibold">ENGGBOT</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <div className="py-4">
              <SidebarMenu>
                {data.navMain
                  .filter(item => visibleItems.includes(item.title.toLowerCase()))
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = item.url === activePath ||
                      (item.url === '/' && activePath === '/') ||
                      (item.url !== '/' && activePath.startsWith(item.url));


                    const translationKey = `sidebar.${item.title.toLowerCase()}`;
                    const title = t(translationKey);

                    if (item.title === 'Projects') {
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            onClick={() => setProjectsExpanded(!projectsExpanded)}
                            className="justify-between"
                            data-active={isActive}
                          >
                            <div className="flex items-center">
                              <Icon className="h-4 w-4 mr-2" />
                              <span>{title}</span>
                            </div>
                            {projectsExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </SidebarMenuButton>

                          {projectsExpanded && (
                            <SidebarMenuSub>
                              {projects.length > 0 ? (
                                projects.map((project) => (
                                  <SidebarMenuSubItem key={project.id} className="group">
                                    <div className="flex items-center w-full">
                                      <SidebarMenuSubButton
                                        onClick={() => router.push(`/projects/${project.id}`)}
                                        className="flex-1"
                                      >
                                        <div className="flex items-center">
                                          <span className="mr-2">{project.emoji}</span>
                                          <span className="text-xs truncate">{project.name}</span>
                                        </div>
                                      </SidebarMenuSubButton>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <MoreVertical className="h-3.5 w-3.5" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                          <DropdownMenuItem
                                            onClick={() => {
                                              navigator.clipboard.writeText(`${window.location.origin}/projects/${project.id}`);
                                              alert('Project link copied to clipboard!');
                                            }}
                                          >
                                            <Share2 className="h-4 w-4 mr-2" />
                                            Share
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => {
                                              setProjectToRename(project);
                                              setNewProjectName(project.name);
                                              setShowRenameProjectDialog(true);
                                            }}
                                          >
                                            <Pencil className="h-4 w-4 mr-2" />
                                            Rename
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => {
                                              setProjectToDelete(project);
                                              setShowDeleteProjectDialog(true);
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </SidebarMenuSubItem>
                                ))
                              ) : (
                                <SidebarMenuSubItem>
                                  <div className="px-4 py-2 text-xs text-muted-foreground">
                                    No projects yet
                                  </div>
                                </SidebarMenuSubItem>
                              )}
                              {/* New Project Button */}
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton
                                  onClick={() => setShowNewProjectDialog(true)}
                                  className="w-full text-primary hover:text-primary"
                                >
                                  <div className="flex items-center">
                                    <Plus className="h-3.5 w-3.5 mr-2" />
                                    <span className="text-xs font-medium">New Project</span>
                                  </div>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            </SidebarMenuSub>
                          )}
                        </SidebarMenuItem>
                      );
                    }

                    // Regular nav items
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          data-active={isActive}
                        >
                          <Link
                            href={item.url}
                            className="flex items-center focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                            onClick={(e) => {
                              setActivePath(item.url);
                            }}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}

                {/* Conversations Menu */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setConversationsExpanded(!conversationsExpanded)}
                    className="justify-between"
                  >
                    <div className="flex items-center">
                      <History className="h-4 w-4 mr-2" />
                      <span>{t('sidebar.conversations')}</span>
                    </div>
                    {conversationsExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </SidebarMenuButton>

                  {conversationsExpanded && (
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton onClick={handleStartNewConversation} className="w-full flex items-center">
                          <PlusCircle className="h-3.5 w-3.5 mr-2" />
                          <span className="font-medium text-primary">{t('sidebar.new_conversation')}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>

                      {conversations.length > 0 ? (
                        conversations.map((convo) => (
                          <SidebarMenuSubItem key={convo.id}>
                            <SidebarMenuSubButton
                              onClick={() => handleSwitchConversation(convo.id)}
                              className={cn(
                                "w-full justify-between group pr-1",
                                convo.id === conversationId && "bg-neutral-700 text-white hover:bg-neutral-700 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-700"
                              )}
                            >
                              <div className="flex flex-col items-start overflow-hidden">
                                {editingConversationId === convo.id ? (
                                  <input
                                    type="text"
                                    value={newConversationTitle}
                                    onChange={(e) => setNewConversationTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleRenameConversation(convo.id, newConversationTitle);
                                      } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setEditingConversationId(null);
                                      }
                                    }}
                                    onBlur={() => {
                                      handleRenameConversation(convo.id, newConversationTitle);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                    className="text-xs w-full p-0.5 bg-background border border-input rounded"
                                  />
                                ) : (
                                  <>
                                    <span className="text-xs truncate w-full text-left">{convo.title}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatTime(convo.updated)}
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* Replace direct delete button with dropdown menu */}
                              {!editingConversationId && convo.id === conversationId && (
                                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <button className="p-1">
                                        <MoreVertical className="h-3 w-3" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" side="right">
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingConversationId(convo.id);
                                          setNewConversationTitle(convo.title);
                                        }}
                                      >
                                        <Pencil className="h-3 w-3 mr-2" />
                                        Rename
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleShareConversation(convo.id);
                                        }}
                                      >
                                        <Share2 className="h-3 w-3 mr-2" />
                                        Share
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(e) => handleDeleteRequest(e, convo.id, convo.title)}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="h-3 w-3 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))
                      ) : (
                        <SidebarMenuSubItem>
                          <div className="px-4 py-2 text-xs text-muted-foreground">
                            No conversations yet
                          </div>
                        </SidebarMenuSubItem>
                      )}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              </SidebarMenu>
            </div>
            <NavSecondary items={data.navSecondary} className="mt-auto" />
          </SidebarContent>
          <SidebarFooter
            className="relative z-30 border-t border-border bg-transparent"
            style={{
              position: 'relative',
              zIndex: 30,
              backgroundColor: 'transparent',
              visibility: 'visible',
              opacity: 1,
              marginTop: 'auto',
              borderTop: '1px solid var(--border)',
              padding: '12px'
            }}
          >
            <NavUser user={userData} />
          </SidebarFooter>
        </Sidebar>

        {/* Standalone toggle button that will remain visible */}
        <Button
          variant="outline"
          size="icon"
          className="sidebar-toggle-btn h-8 w-8 rounded-full hover:bg-accent hover:text-accent-foreground"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Simple custom modal instead of AlertDialog */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={handleCancelDelete}>
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md mx-auto"
            onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-2">Are you sure?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This conversation will be permanently deleted.
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={handleCancelDelete}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Project Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteProjectDialog} onOpenChange={setShowDeleteProjectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{projectToDelete?.name}&quot;?
              This will also delete all conversations in this project. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProjectToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (projectToDelete) {
                  try {
                    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
                    const email = userData?.email || '';
                    const response = await fetch(`/api/projects/${projectToDelete.id}?email=${encodeURIComponent(email)}`, {
                      method: 'DELETE',
                    });
                    if (response.ok) {
                      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
                    }
                  } catch (error) {
                    console.error('Error deleting project:', error);
                  }
                }
                setShowDeleteProjectDialog(false);
                setProjectToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project Rename Dialog */}
      <Dialog open={showRenameProjectDialog} onOpenChange={setShowRenameProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Enter a new name for &quot;{projectToRename?.name}&quot;
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Project name"
            className="mt-2"
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => {
              setShowRenameProjectDialog(false);
              setProjectToRename(null);
              setNewProjectName('');
            }}>
              Cancel
            </Button>
            <Button onClick={async () => {
              if (projectToRename && newProjectName.trim()) {
                try {
                  const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
                  const email = userData?.email || '';
                  const response = await fetch(`/api/projects/${projectToRename.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email,
                      name: newProjectName.trim(),
                    }),
                  });
                  if (response.ok) {
                    setProjects(prev => prev.map(p =>
                      p.id === projectToRename.id ? { ...p, name: newProjectName.trim() } : p
                    ));
                  }
                } catch (error) {
                  console.error('Error renaming project:', error);
                }
              }
              setShowRenameProjectDialog(false);
              setProjectToRename(null);
              setNewProjectName('');
            }}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Project Dialog */}
      <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Enter a name for your new project
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newProjectInput}
            onChange={(e) => setNewProjectInput(e.target.value)}
            placeholder="Project name"
            className="mt-2"
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => {
              setShowNewProjectDialog(false);
              setNewProjectInput('');
            }}>
              Cancel
            </Button>
            <Button onClick={async () => {
              if (newProjectInput.trim()) {
                try {
                  const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
                  const email = userData?.email || '';
                  const response = await fetch('/api/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email,
                      name: newProjectInput.trim(),
                      emoji: '📁',
                    }),
                  });
                  if (response.ok) {
                    const data = await response.json();
                    setProjects(prev => [...prev, data.project]);
                  }
                } catch (error) {
                  console.error('Error creating project:', error);
                }
              }
              setShowNewProjectDialog(false);
              setNewProjectInput('');
            }}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 