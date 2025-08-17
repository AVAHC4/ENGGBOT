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
  Trash2
} from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

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
import { getAllConversationsMetadata } from "@/lib/storage"

// Add this function to get user data from localStorage
function getUserData() {
  if (typeof window === 'undefined') {
    return {
      name: "User",
      email: "user@example.com",
      avatar: "",
    };
  }
  
  try {
    // Try to get user data from localStorage - this would be set during Google auth
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    
    // If we have user data, use it; otherwise return default
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

const data = {
  user: getUserData(),
  navMain: [
    {
      title: "Chat",
      url: "/",
      icon: MessageSquare,
    },
    {
      title: "Compiler",
      url: "/compiler",
      icon: FileCode,
    },
    {
      title: "Projects",
      url: "#",
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
      title: "Terms and Conditions",
      url: "#",
      icon: HelpCircle,
    },
    {
      title: "Search",
      url: "#",
      icon: Search,
    },
  ],
  documents: [],
}

export function AppSidebar({ className, ...props }: React.ComponentProps<typeof Sidebar>) {
  const [conversationsExpanded, setConversationsExpanded] = React.useState(false);
  const [conversations, setConversations] = React.useState<any[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [activePath, setActivePath] = React.useState('/');
  const { conversationId, switchConversation, startNewConversation, deleteCurrentConversation } = useChat();
  
  // Use default empty values for initial server-side rendering
  const [userData, setUserData] = React.useState({
    name: "User",
    email: "user@example.com",
    avatar: "",
  });
  
  // Flag to track if component is mounted (client-side only)
  const [isMounted, setIsMounted] = React.useState(false);
  
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

  // Refresh user data - only run on client side after component is mounted
  React.useEffect(() => {
    if (isMounted) {
      const refreshUserData = () => {
        setUserData(getUserData());
      };
      
      // Refresh on mount
      refreshUserData();
      
      // Set up event listener to refresh user data when authentication changes
      window.addEventListener('storage', (event) => {
        if (event.key === 'authenticated' || 
            event.key === 'user_data' || 
            event.key === 'user_name' || 
            event.key === 'user_email' || 
            event.key === 'user_avatar') {
          refreshUserData();
        }
      });
    }
  }, [isMounted]);

  // Load conversations - only on client side after mounting
  React.useEffect(() => {
    if (isMounted) {
      const loadConversations = () => {
        const allConversations = getAllConversationsMetadata();
        setConversations(allConversations);
      };
      
      loadConversations();
      
      // Refresh conversations every 5 seconds
      const intervalId = setInterval(loadConversations, 5000);
      
      return () => clearInterval(intervalId);
    }
  }, [conversationId, isMounted]);

  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return 'Unknown date';
    }
  };

  // Set active path based on current location
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateActivePath = () => {
        const pathname = window.location.pathname;
        // Find the matching nav item with the longest URL match
        // This ensures more specific paths like /compiler take precedence over /
        const matchingItem = data.navMain.find(item => 
          pathname === item.url || (item.url !== '/' && pathname.startsWith(item.url))
        );
        
        if (matchingItem) {
          setActivePath(matchingItem.url);
        } else if (pathname === '/') {
          setActivePath('/');
        }
      };
      
      // Update on initial load
      updateActivePath();
      
      // Listen for route changes
      window.addEventListener('popstate', updateActivePath);
      return () => window.removeEventListener('popstate', updateActivePath);
    }
  }, []);

  // Update the useEffect section with better visibility handling
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
      
      /* Fix for the profile section - ensure footer is visible */
      [data-sidebar="footer"] {
        position: relative;
        z-index: 10;
        margin-top: auto;
        background-color: var(--background);
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
      
      /* Compiler and team sections specific adjustments */
      body.sidebar-collapsed .compiler-page,
      body.sidebar-collapsed .team-page {
        margin-left: 0;
        padding-left: 60px;
      }
      
      /* Fix for selection boxes on interactive elements */
      [data-slot="sidebar"] a,
      [data-slot="sidebar"] button,
      [data-slot="sidebar"] [role="button"],
      [data-slot="sidebar-menu-button"] a,
      [data-slot="sidebar-menu-button"] {
        outline: none !important;
        box-shadow: none !important;
      }
      
      [data-slot="sidebar"] a:focus,
      [data-slot="sidebar"] button:focus,
      [data-slot="sidebar"] [role="button"]:focus {
        outline: none !important;
        box-shadow: none !important;
      }
      
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
  
  return (
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
          "transition-all duration-300 border-none", 
          sidebarCollapsed ? "opacity-0 invisible" : "opacity-100 visible",
          className
        )}
        style={{
          width: '200px',
          minWidth: '200px',
          maxWidth: '200px',
          overflow: 'hidden'
        }}
        {...props}
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
                <Link href="/" className="focus:outline-none">
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
              {data.navMain.map((item) => {
                const Icon = item.icon;
                const isActive = item.url === activePath || 
                  (item.url === '/' && activePath === '/') ||
                  (item.url !== '/' && activePath.startsWith(item.url));
                
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
                          // Update active path for all nav items, not just chat
                          setActivePath(item.url);
                        }}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
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
                    <span>Conversations</span>
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
                      <SidebarMenuSubButton onClick={startNewConversation} className="w-full flex items-center">
                        <PlusCircle className="h-3.5 w-3.5 mr-2" />
                        <span className="font-medium text-primary">New Conversation</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    
                    {conversations.length > 0 ? (
                      conversations.map((convo) => (
                        <SidebarMenuSubItem key={convo.id}>
                          <SidebarMenuSubButton 
                            onClick={() => switchConversation(convo.id)}
                            className={cn(
                              "w-full justify-between group pr-1", 
                              convo.id === conversationId && "bg-muted/50"
                            )}
                          >
                            <div className="flex flex-col items-start overflow-hidden">
                              <span className="text-xs truncate w-full text-left">{convo.title}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatTime(convo.updated)}
                              </span>
                            </div>
                            
                            {convo.id === conversationId && (
                              <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteCurrentConversation();
                                  }}
                                  className="p-1 hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
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
          className="relative z-30 border-t border-border bg-background" 
          style={{
            position: 'relative',
            zIndex: 30,
            backgroundColor: 'var(--background)',
            visibility: 'visible',
            opacity: 1,
            marginTop: 'auto',
            borderTop: '1px solid var(--border)',
            padding: '12px'
          }}
        >
          <div className="flex items-center gap-3 px-2 py-1.5" data-slot="nav-user">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">
              {userData.name ? userData.name.substring(0, 1).toUpperCase() : "U"}
            </div>
            <div className="grid flex-1 gap-px">
              <span className="truncate font-semibold">
                {userData.name || "User"}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {userData.email || "user@example.com"}
              </span>
            </div>
          </div>
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
  )
} 