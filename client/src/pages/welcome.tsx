import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { Link } from "wouter";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import { AnimatedGroup } from "@/components/motion-primitives/animated-group";

interface UserData {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export default function WelcomePage() {
  const [showProfileCard, setShowProfileCard] = useState(false);
  
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

  // Transition variants for animations
  const transitionVariants = {
    item: {
      hidden: {
        opacity: 0,
        filter: "blur(12px)",
        y: 12,
      },
      visible: {
        opacity: 1,
        filter: "blur(0px)",
        y: 0,
        transition: {
          type: "spring",
          bounce: 0.3,
          duration: 1.5,
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-800 to-black">
      <div className="absolute inset-0 -z-20">
        <div className="absolute inset-0 -z-10 size-full bg-gradient-to-b from-black via-gray-800 to-black"></div>
      </div>

      {/* Header with profile button */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto flex justify-between items-center py-4">
          <Link href="/" aria-label="go home">
            <div className="flex items-center space-x-2">
              <Logo />
              <span className="text-2xl font-bold">ENGGBOT</span>
            </div>
          </Link>
          
          {isLoading ? (
            <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse"></div>
          ) : user ? (
            <div className="relative">
              <button 
                onClick={() => setShowProfileCard(!showProfileCard)}
                className="relative"
              >
                <img 
                  src={user.avatar || "https://ferf1mheo22r9ira.public.blob.vercel-storage.com/avatar-02-albo9B0tWOSLXCVZh9rX9KFxXIVWMr.png"} 
                  alt={user.name} 
                  className="w-10 h-10 rounded-full border-2 border-white"
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-1 ring-white"></div>
              </button>
              
              {/* Profile Card Popup */}
              {showProfileCard && (
                <div className="absolute right-0 top-12 w-80 z-50">
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

                        <Link
                          href="/api/auth/logout"
                          className="w-full flex items-center justify-between p-2 
                                hover:bg-zinc-50 dark:hover:bg-zinc-800/50 
                                rounded-lg transition-colors duration-200"
                        >
                          <div className="flex items-center gap-2">
                            <span>🚪</span>
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Logout</span>
                          </div>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>
      </header>

      {/* Main content */}
      <section className="relative z-10 pt-24 flex min-h-screen items-center justify-center px-4 py-16 md:py-32">
        <AnimatedGroup variants={transitionVariants}>
          <div className="max-w-3xl mx-auto text-center">
            <TextEffect
              preset="fade-in-blur"
              speedSegment={0.3}
              as="h1"
              className="text-4xl md:text-6xl font-bold mb-6"
            >
              {`Welcome${user ? `, ${user.name}!` : '!'}`}
            </TextEffect>
            
            <TextEffect
              per="line"
              preset="fade-in-blur"
              speedSegment={0.3}
              delay={0.5}
              as="p"
              className="text-xl mb-8"
            >
              {"You've successfully connected your Google account.\nYour profile is now visible in the top right corner."}
            </TextEffect>
            
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/">Go to Homepage</Link>
              </Button>
              
              <Button asChild variant="outline" size="lg">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          </div>
        </AnimatedGroup>
      </section>
    </div>
  );
} 