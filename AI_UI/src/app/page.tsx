"use client";

import { useState, useEffect } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ChatPresenceIndicator } from "@/components/chat-presence-indicator";
import { checkExternalAuth } from "@/lib/auth-helpers";
import { useRouter } from "next/navigation";

// Team members with presence status
const teamMembers = [
  {
    id: "1",
    name: "Sarah Johnson",
    avatar: "https://i.pravatar.cc/150?img=1",
    isOnline: true,
  },
  {
    id: "2",
    name: "Michael Chen",
    avatar: "https://i.pravatar.cc/150?img=8",
    isOnline: true,
  },
  {
    id: "3",
    name: "Jessica Smith",
    avatar: "https://i.pravatar.cc/150?img=5",
    isOnline: false,
    lastSeen: "20m ago",
  },
  {
    id: "4",
    name: "David Rodriguez",
    avatar: "https://i.pravatar.cc/150?img=3",
    isOnline: false,
    lastSeen: "1h ago",
  },
];

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for authentication from the main app
    const authenticated = checkExternalAuth();
    setIsAuthenticated(authenticated);
    setIsLoading(false);
    
    // If not authenticated, redirect to the main app's login page
    if (!authenticated) {
      window.location.href = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'http://localhost:3000/login';
    }
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show chat interface if authenticated
  if (isAuthenticated) {
    return (
      <main className="flex flex-col min-h-screen">
        {/* Presence indicator moved to the chat interface */}
        <div className="absolute top-4 right-4 z-10">
          <ChatPresenceIndicator members={teamMembers} />
        </div>
        
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          <ChatInterface />
        </div>
      </main>
    );
  }

  // Should not reach here due to redirect
  return null;
}
// Enhanced user experience with optimized rendering
