import { useEffect } from "react";
import { useLocation } from "wouter";
import { Logo } from "@/components/logo";

export default function LoadingPage() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Check authentication status after a short delay
    const checkAuth = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user`, {
          credentials: "include",
        });
        
        if (response.ok) {
          // If authenticated, redirect to chat page instead of welcome page
          setLocation("/chat");
        } else {
          // If not authenticated, redirect to login page
          setLocation("/login?error=auth_failed");
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        setLocation("/login?error=server_error");
      }
    };
    
    // Check auth status after a delay to ensure session is set
    const timer = setTimeout(() => {
      checkAuth();
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [setLocation]);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-800 to-black flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-8">
          <Logo className="w-24 h-24 animate-pulse" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Completing Login...</h1>
        <p className="text-lg text-zinc-400">Please wait while we set up your account</p>
        
        <div className="mt-8 flex justify-center">
          <div className="w-16 h-16 border-t-4 border-b-4 border-white rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
} 