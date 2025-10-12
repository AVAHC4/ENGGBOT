"use client";

import { useState, useEffect } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import AvatarGroup from "@/components/ui/avatar-group";

import { checkExternalAuth } from "@/lib/auth-helpers";
import { useRouter } from "next/navigation";


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
      <main className="min-h-screen chat-page overflow-hidden">
        <div className="absolute top-4 right-4 z-10 hidden md:block">
          <AvatarGroup
            items={[
              {
                id: 1,
                name: "John Doe",
                designation: "Software Engineer",
                image: "https://randomuser.me/api/portraits/men/60.jpg",
              },
              {
                id: 2,
                name: "Jane Smith",
                designation: "Product Manager",
                image: "https://randomuser.me/api/portraits/men/61.jpg",
              },
              {
                id: 3,
                name: "Jim Beam",
                designation: "Marketing Manager",
                image: "https://randomuser.me/api/portraits/men/62.jpg",
              },
              {
                id: 4,
                name: "John Doe",
                designation: "Software Engineer",
                image: "https://randomuser.me/api/portraits/men/63.jpg",
              },
              {
                id: 5,
                name: "John Doe",
                designation: "Software Engineer",
                image: "https://randomuser.me/api/portraits/men/64.jpg",
              },
              {
                id: 6,
                name: "John Doe",
                designation: "Software Engineer",
                image: "https://randomuser.me/api/portraits/men/65.jpg",
              },
            ]}
            maxVisible={5}
            size="md"
          />
        </div>

        
        <div className="flex-1">
          <ChatInterface />
        </div>
      </main>
    );
  }

  // Should not reach here due to redirect
  return null;
}
// Enhanced user experience with optimized rendering
