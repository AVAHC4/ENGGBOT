import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AiChat from "../../../ai-chat";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { Link } from "wouter";

interface UserData {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export default function ChatDashboard() {
  const [, setLocation] = useLocation();
  const [showProfileCard, setShowProfileCard] = useState(false);
  const queryClient = useQueryClient();

  // Fetch user data to check authentication
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }
      return response.json() as Promise<UserData>;
    },
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user && error) {
      setLocation("/login");
    }
  }, [user, isLoading, error, setLocation]);

  // Handle logout
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      // Call the logout endpoint
      await fetch(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {
        credentials: "include",
        method: "GET",
      });
      
      // Clear auth-related query cache
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.setQueryData(["user"], null);
      
      // Close the profile card
      setShowProfileCard(false);
      
      // Redirect to home page
      setLocation("/");
      
      // Reload the page to ensure all state is cleared
      window.location.reload();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <Logo className="w-16 h-16 animate-pulse" />
          </div>
          <h1 className="text-xl font-bold mb-4">Loading your AI Assistant...</h1>
          <div className="mt-4 flex justify-center">
            <div className="w-10 h-10 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  // If authentication fails, this will redirect (see useEffect above)
  if (!user) {
    return null;
  }

  // User is authenticated, show the AI chat interface
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with user info */}
      <header className="bg-black/90 backdrop-blur-sm border-b border-zinc-800 py-3 px-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Logo className="w-8 h-8" />
            <span className="font-bold text-lg">ENGGBOT AI</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <span className="text-sm text-zinc-400">Logged in as</span>
              <span className="text-sm font-medium ml-2">{user.name}</span>
            </div>
            
            <div className="relative">
              <Button 
                onClick={() => setShowProfileCard(!showProfileCard)} 
                variant="ghost" 
                size="sm" 
                className="rounded-full"
              >
                <img 
                  src={user.avatar || "https://ferf1mheo22r9ira.public.blob.vercel-storage.com/avatar-02-albo9B0tWOSLXCVZh9rX9KFxXIVWMr.png"} 
                  alt={user.name} 
                  className="w-8 h-8 rounded-full ring-1 ring-emerald-500/50"
                />
              </Button>
              
              {/* Profile Card Popup */}
              {showProfileCard && (
                <div className="absolute right-[-50px] top-12 w-80 z-50">
                  <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="relative px-6 pt-12 pb-6">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="relative shrink-0">
                          <img
                            src={user.avatar || "https://ferf1mheo22r9ira.public.blob.vercel-storage.com/avatar-02-albo9B0tWOSLXCVZh9rX9KFxXIVWMr.png"}
                            alt={user.name}
                            className="w-[72px] h-[72px] rounded-full ring-4 ring-white dark:ring-zinc-900 object-cover"
                          />
                          <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
                        </div>

                        {/* Profile Info */}
                        <div className="flex-1">
                          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{user.name}</h2>
                          <p className="text-zinc-600 dark:text-zinc-400">{user.email}</p>
                        </div>
                      </div>
                      <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-6" />
                      <div className="space-y-2">
                        {[
                          { label: "Subscription", value: "Free Trial", href: "#", icon: "💳" },
                          { label: "Settings", href: "#", icon: "⚙️" },
                          { label: "Terms & Policies", href: "#", icon: "📄", external: true },
                        ].map((item) => (
                          <Link
                            key={item.label}
                            href={item.href}
                            className="flex items-center justify-between p-2 
                                    hover:bg-zinc-50 dark:hover:bg-zinc-800/50 
                                    rounded-lg transition-colors duration-200"
                          >
                            <div className="flex items-center gap-2">
                              <span>{item.icon}</span>
                              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.label}</span>
                            </div>
                            <div className="flex items-center">
                              {item.value && <span className="text-sm text-zinc-500 dark:text-zinc-400 mr-2">{item.value}</span>}
                              {item.external && <span>↗</span>}
                            </div>
                          </Link>
                        ))}

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center justify-between p-2 
                                hover:bg-zinc-50 dark:hover:bg-zinc-800/50 
                                rounded-lg transition-colors duration-200 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span>🚪</span>
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Logout</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content - AI Chat */}
      <main className="flex-1">
        <AiChat />
      </main>
    </div>
  );
} 