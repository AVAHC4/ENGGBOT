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
  FolderOpen,
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
import { useAvatar } from "@/context/avatar-context"
import { getAllConversationsMetadataSync as getAllConversationsMetadata, saveConversationMetadata, getConversationMetadata, loadProjects, createProject, deleteProject, renameProject, loadProjectConversations, deleteProjectConversation } from "@/lib/storage"
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

    // Prioritize saved username from profile settings over Google profile name
    if (userData && (userData.username || userData.name)) {
      return {
        name: userData.username || userData.name || "User",
        email: userData.email || "user@example.com",
        avatar: userData.avatar || "",
      };
    }


    if (localStorage.getItem('authenticated') === 'true') {

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
      title: "New Chat",
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


const initialFriends: Friend[] = [];

export function AppSidebar({ className, ...props }: React.ComponentPropsWithoutRef<typeof Sidebar>) {
  const [conversationsExpanded, setConversationsExpanded] = React.useState(false);
  const [teamsExpanded, setTeamsExpanded] = React.useState(false);
  const [projectsExpanded, setProjectsExpanded] = React.useState(false);
  const [projects, setProjects] = React.useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = React.useState(true);
  const [expandedProjectIds, setExpandedProjectIds] = React.useState<Set<string>>(new Set());
  const [projectConversations, setProjectConversations] = React.useState<Record<string, any[]>>({});
  const [showNewProjectDialog, setShowNewProjectDialog] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState("");
  const [editingProjectId, setEditingProjectId] = React.useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = React.useState("");
  const [projectToDelete, setProjectToDelete] = React.useState<{ id: string; name: string } | null>(null);
  const [showDeleteProjectModal, setShowDeleteProjectModal] = React.useState(false);
  const [activeProjectId, setActiveProjectId] = React.useState<string | null>(null);
  const [activeProjectConversationId, setActiveProjectConversationId] = React.useState<string | null>(null);
  const [friends, setFriends] = React.useState<Friend[]>(() => {

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
  const [conversationsLoading, setConversationsLoading] = React.useState(true);
  const [allConversations, setAllConversations] = React.useState<any[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [activePath, setActivePath] = React.useState('');
  const pathname = usePathname();
  const { conversationId, switchConversation, startNewConversation, deleteCurrentConversation, messages } = useChat();
  const router = useRouter();
  const { t } = useLanguage();
  const { avatar: contextAvatar } = useAvatar();

  const handleSwitchConversation = (id: string) => {
    switchConversation(id);


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


  const [userData, setUserData] = React.useState({
    name: "User",
    email: "user@example.com",
    avatar: "",
  });


  const [isMounted, setIsMounted] = React.useState(false);


  const [editingConversationId, setEditingConversationId] = React.useState<string | null>(null);
  const [newConversationTitle, setNewConversationTitle] = React.useState("");


  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [conversationToDelete, setConversationToDelete] = React.useState<{ id: string, title: string } | null>(null);


  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);

    if (!sidebarCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  };


  React.useEffect(() => {
    setIsMounted(true);
  }, []);


  const [visibleItems, setVisibleItems] = React.useState<string[]>(["new chat", "compiler", "teams", "projects"]);


  React.useEffect(() => {
    if (isMounted) {
      const refreshUserData = () => {
        setUserData(getUserData());
      };

      const loadVisibleItems = () => {
        const savedItems = localStorage.getItem("sidebar_preferences");
        if (savedItems) {
          try {
            const items = JSON.parse(savedItems);

            const migratedItems = items.map((i: string) => i === 'chat' ? 'new chat' : i);

            if (!migratedItems.includes('new chat') && !migratedItems.includes('chat')) {

            }
            setVisibleItems(migratedItems);


          } catch (e) {
            console.error("Failed to parse sidebar preferences", e);
          }
        }
      };


      refreshUserData();
      loadVisibleItems();


      const userEmail = localStorage.getItem('user_email');
      if (userEmail) {
        fetch(`/api/settings?email=${encodeURIComponent(userEmail)}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data?.settings?.username) {
              localStorage.setItem('user_name', data.settings.username);
              const currentData = localStorage.getItem('user_data');
              if (currentData) {
                try {
                  const parsed = JSON.parse(currentData);
                  if (parsed.username !== data.settings.username) {
                    parsed.username = data.settings.username;
                    localStorage.setItem('user_data', JSON.stringify(parsed));
                    refreshUserData();
                  }
                } catch { }
              }
            }
          })
          .catch(e => console.error("Failed to fetch settings:", e));
      }


      window.addEventListener('storage', (event) => {
        if (event.key === 'authenticated' ||
          event.key === 'user_data' ||
          event.key === 'user_name' ||
          event.key === 'user_email' ||
          event.key === 'user_avatar') {
          refreshUserData();
        }
        if (event.key === 'sidebar_preferences' || event.type === 'storage') {



          loadVisibleItems();
        }
      });
    }
  }, [isMounted]);



  React.useEffect(() => {
    if (isMounted) {
      const loadConversations = async () => {
        setConversationsLoading(true);
        try {
          const fetchedConversations = await getAllConversationsMetadata();


          setAllConversations(fetchedConversations);
          setConversations(fetchedConversations);
        } finally {
          setConversationsLoading(false);
        }
      };


      loadConversations();


      const handleConversationUpdate = () => loadConversations();
      window.addEventListener('conversationUpdated', handleConversationUpdate);

      return () => {
        window.removeEventListener('conversationUpdated', handleConversationUpdate);
      };
    }
  }, [isMounted]);


  React.useEffect(() => {
    if (isMounted) {
      const loadAllProjects = async () => {
        setProjectsLoading(true);
        try {
          const fetchedProjects = await loadProjects();
          setProjects(fetchedProjects);
        } finally {
          setProjectsLoading(false);
        }
      };

      loadAllProjects();


      const handleProjectUpdate = () => loadAllProjects();
      window.addEventListener('projectUpdated', handleProjectUpdate);

      return () => {
        window.removeEventListener('projectUpdated', handleProjectUpdate);
      };
    }
  }, [isMounted]);


  React.useEffect(() => {
    if (isMounted) {
      expandedProjectIds.forEach(async (projectId) => {
        if (!projectConversations[projectId]) {
          const convos = await loadProjectConversations(projectId);
          setProjectConversations(prev => ({ ...prev, [projectId]: convos }));
        }
      });
    }

  }, [expandedProjectIds, isMounted]);


  const toggleProjectExpansion = async (projectId: string) => {
    setExpandedProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });


    if (!projectConversations[projectId]) {
      const convos = await loadProjectConversations(projectId);
      setProjectConversations(prev => ({ ...prev, [projectId]: convos }));
    }
  };


  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      setShowNewProjectDialog(false);
      return;
    }

    const project = await createProject(newProjectName.trim());
    if (project) {
      setProjects(prev => [project, ...prev]);
    }

    setNewProjectName("");
    setShowNewProjectDialog(false);
  };


  const handleRenameProject = async (projectId: string) => {
    if (!editingProjectName.trim()) {
      setEditingProjectId(null);
      return;
    }

    await renameProject(projectId, editingProjectName.trim());
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, name: editingProjectName.trim() } : p
    ));

    setEditingProjectId(null);
  };


  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    await deleteProject(projectToDelete.id);
    setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));


    setExpandedProjectIds(prev => {
      const next = new Set(prev);
      next.delete(projectToDelete.id);
      return next;
    });
    setProjectConversations(prev => {
      const next = { ...prev };
      delete next[projectToDelete.id];
      return next;
    });

    if (activeProjectId === projectToDelete.id) {
      setActiveProjectId(null);
      setActiveProjectConversationId(null);
    }

    setShowDeleteProjectModal(false);
    setProjectToDelete(null);
  };



  const handleNewProjectConversation = async (projectId: string) => {

    const newConversationId = crypto.randomUUID();

    setActiveProjectId(projectId);
    setActiveProjectConversationId(newConversationId);

    router.push(`/AI_UI/project/${projectId}/c/${newConversationId}`);
  };


  const handleSwitchToProjectConversation = (projectId: string, conversationId: string) => {
    setActiveProjectId(projectId);
    setActiveProjectConversationId(conversationId);


    router.push(`/AI_UI/project/${projectId}/c/${conversationId}`);
  };


  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return 'Unknown date';
    }
  };


  React.useEffect(() => {
    if (!pathname) return;

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


  const handleRemoveFriend = (id: string) => {
    setFriends(friends.filter(friend => friend.id !== id));
  };


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


      const updatedMeta = {
        ...existingMeta,
        title: newTitle,
        updated: new Date().toISOString()
      };


      saveConversationMetadata(id, updatedMeta);


      const updatedConversations = await getAllConversationsMetadata();
      setConversations(updatedConversations);
    }


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

      setConversations(prev => prev.filter(c => c.id !== conversationToDelete.id));

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


                    const translationKey = `sidebar.${item.title.toLowerCase().replace(' ', '_')}`;
                    const title = t(translationKey);



                    if (item.title === "New Chat") {
                      const isChatActive = pathname === '/AI_UI' && messages.length === 0;
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            data-active={isChatActive}
                            onClick={() => {
                              startNewConversation();
                              setActivePath(item.url);
                              router.push(item.url);
                            }}
                            className="flex items-center focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 cursor-pointer"
                          >
                            <Icon className="h-4 w-4" />
                            <span>{title}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    }


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

                { }
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

                      {conversationsLoading ? (

                        <div className="space-y-1 px-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-2 px-2 py-2 animate-pulse">
                              <div className="flex-1 space-y-1.5">
                                <div className="h-3 bg-white/10 rounded w-20" />
                                <div className="h-2 bg-white/10 rounded w-14" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : conversations.length > 0 ? (
                        conversations.map((convo) => (
                          <SidebarMenuSubItem key={convo.id}>
                            <SidebarMenuSubButton
                              onClick={() => handleSwitchConversation(convo.id)}
                              className={cn(
                                "w-full justify-between group pr-1 cursor-pointer",
                                convo.id === conversationId && pathname === '/AI_UI' && "bg-neutral-700 text-white hover:bg-neutral-700 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-700"
                              )}
                            >
                              <div className="flex flex-col items-start overflow-hidden cursor-pointer">
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
                                    <span className="text-xs truncate w-full text-left cursor-pointer">{convo.title}</span>
                                  </>
                                )}
                              </div>

                              { }
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

                { }
                {visibleItems.includes('projects') && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setProjectsExpanded(!projectsExpanded)}
                      className="justify-between"
                    >
                      <div className="flex items-center">
                        <Folder className="h-4 w-4 mr-2" />
                        <span>{t('sidebar.projects') || 'Projects'}</span>
                      </div>
                      {projectsExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </SidebarMenuButton>

                    {projectsExpanded && (
                      <SidebarMenuSub>
                        { }
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => setShowNewProjectDialog(true)}
                            className="w-full flex items-center"
                          >
                            <PlusCircle className="h-3.5 w-3.5 mr-2" />
                            <span className="font-medium text-primary">New Project</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>

                        {projectsLoading ? (

                          <div className="space-y-1 px-2">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="flex items-center gap-2 px-2 py-2 animate-pulse">
                                <div className="h-3.5 w-3.5 bg-white/10 rounded" />
                                <div className="flex-1 space-y-1.5">
                                  <div className="h-3 bg-white/10 rounded w-20" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : projects.length > 0 ? (
                          projects.map((project) => (
                            <SidebarMenuSubItem key={project.id}>
                              <SidebarMenuSubButton
                                onClick={() => router.push(`/AI_UI/project/${project.id}`)}
                                className={cn(
                                  "w-full justify-between group pr-1",
                                  pathname?.startsWith(`/AI_UI/project/${project.id}`) && "bg-neutral-700 text-white hover:bg-neutral-700"
                                )}
                              >
                                <div className="flex items-center overflow-hidden">
                                  <Folder className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                                  {editingProjectId === project.id ? (
                                    <input
                                      type="text"
                                      value={editingProjectName}
                                      onChange={(e) => setEditingProjectName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleRenameProject(project.id);
                                        } else if (e.key === 'Escape') {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setEditingProjectId(null);
                                        }
                                      }}
                                      onBlur={() => handleRenameProject(project.id)}
                                      onClick={(e) => e.stopPropagation()}
                                      autoFocus
                                      className="text-xs w-full p-0.5 bg-background border border-input rounded"
                                    />
                                  ) : (
                                    <span className="text-xs truncate">{project.name}</span>
                                  )}
                                </div>

                                { }
                                {!editingProjectId && (
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
                                            setEditingProjectId(project.id);
                                            setEditingProjectName(project.name);
                                          }}
                                        >
                                          <Pencil className="h-3 w-3 mr-2" />
                                          Rename
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setProjectToDelete({ id: project.id, name: project.name });
                                            setShowDeleteProjectModal(true);
                                          }}
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
                              No projects yet
                            </div>
                          </SidebarMenuSubItem>
                        )}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                )}
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
            <NavUser user={{ ...userData, avatar: contextAvatar || userData.avatar }} />
          </SidebarFooter>
        </Sidebar>

        { }
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

      { }
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

      { }
      {showNewProjectDialog && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setShowNewProjectDialog(false)}>
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md mx-auto w-full"
            onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Create New Project</h2>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateProject();
                } else if (e.key === 'Escape') {
                  setShowNewProjectDialog(false);
                }
              }}
              placeholder="Project name..."
              autoFocus
              className="w-full p-2 border border-input rounded bg-background text-sm mb-4"
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowNewProjectDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      { }
      {showDeleteProjectModal && projectToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => {
            setShowDeleteProjectModal(false);
            setProjectToDelete(null);
          }}>
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md mx-auto"
            onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-2">Delete Project?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              The project &quot;{projectToDelete.name}&quot; and all its conversations will be permanently deleted.
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteProjectModal(false);
                  setProjectToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteProject}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 