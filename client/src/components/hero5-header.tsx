"use client"
import { Logo } from "./logo"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import React from "react"
import { cn } from "@/lib/utils"
import { Link, useLocation } from "wouter"
import { useQuery, useQueryClient } from "@tanstack/react-query"

interface UserData {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

const menuItems = [
  { name: "Features", href: "#link" },
  { name: "Enterprise", href: "#link" },
  { name: "Pricing", href: "#link" },
  { name: "Documentation", href: "#link" },
]

export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false)
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [showProfileCard, setShowProfileCard] = React.useState(false)
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch user data to check authentication
  const { data: user, isLoading } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user`, {
          credentials: "include",
        });
        if (!response.ok) {
          return null;
        }
        return response.json() as Promise<UserData>;
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Close profile card if clicked outside
  React.useEffect(() => {
    if (!showProfileCard) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if ((e.target as Element)?.closest('.profile-card-container')) return;
      setShowProfileCard(false);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showProfileCard]);

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

  return (
    <header>
      <nav data-state={menuState && "active"} className="fixed z-20 w-full px-2">
        <div
          className={cn(
            "mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12",
            isScrolled && "bg-background/50 max-w-4xl rounded-2xl border backdrop-blur-lg lg:px-5",
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <Link href="/" aria-label="home" className="flex items-center space-x-2">
                <Logo />
                <span className="font-semibold">ENGGBOT</span>
              </Link>

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? "Close Menu" : "Open Menu"}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className={cn("m-auto size-6 duration-200", menuState && "rotate-180 scale-0 opacity-0")} />
                <X className={cn("absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200", 
                   menuState && "rotate-0 scale-100 opacity-100")} />
              </button>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-sm">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <Link
                      href={item.href}
                      className="text-muted-foreground hover:text-accent-foreground block duration-150"
                    >
                      <span>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className={cn(
              "bg-background mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent",
              menuState && "block"
            )}>
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <Link
                        href={item.href}
                        className="text-muted-foreground hover:text-accent-foreground block duration-150"
                      >
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                {isLoading ? (
                  // Loading skeleton
                  <div className="w-8 h-8 rounded-full bg-muted animate-pulse"></div>
                ) : user ? (
                  // User is authenticated, show profile avatar
                  <div className="relative profile-card-container">
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowProfileCard(!showProfileCard);
                      }} 
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
                      <div className="absolute right-0 top-12 w-80 z-50 profile-card-content">
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
                              <Link
                                href="/chat"
                                className="w-full flex items-center justify-between p-2 
                                        hover:bg-zinc-50 dark:hover:bg-zinc-800/50 
                                        rounded-lg transition-colors duration-200"
                              >
                                <div className="flex items-center gap-2">
                                  <span>💬</span>
                                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">AI Chat</span>
                                </div>
                              </Link>
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
                ) : (
                  // User is not authenticated, show login/signup buttons
                  <>
                    <Button asChild variant="outline" size="sm" className={cn(isScrolled && "lg:hidden")}>
                      <Link href="/login">
                        <span>Login</span>
                      </Link>
                    </Button>
                    <Button asChild size="sm" className={cn(isScrolled && "lg:hidden")}>
                      <Link href="/sign-up">
                        <span>Get Started</span>
                      </Link>
                    </Button>
                    <Button asChild size="sm" className={cn(isScrolled ? "lg:inline-flex" : "hidden")}>
                      <Link href="/login">
                        <span>Try AI Chat</span>
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}