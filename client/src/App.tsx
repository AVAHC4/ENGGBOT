import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import LoginPage from "@/pages/login";
import SignUpPage from "@/pages/sign-up";
import WelcomePage from "@/pages/welcome";
import LoadingPage from "@/pages/loading";
import ChatDashboard from "@/pages/chat-dashboard";
import RivaTest from "@/components/RivaTest";
import { ThemeToggle } from "./components/ThemeToggle";
import { useEffect } from "react";
import React from "react";
import {
  isAuthenticated,
  clearAuthData
} from "@/lib/auth-storage";

// Wrap the ChatDashboard component to handle authentication
function ProtectedChatDashboard() {
  const [, setLocation] = useLocation();
  const [localAuth, setLocalAuth] = React.useState(false);

  // First check for quick auth indicators before doing a full API check
  React.useEffect(() => {
    // Check authentication using the centralized helper
    if (isAuthenticated()) {
      // If any auth evidence exists, proceed to chat interface
      setLocalAuth(true);
    }
  }, []);

  // Only perform API check if quick auth failed
  const { data: authStatus, isLoading } = useQuery({
    queryKey: ["auth-status"],
    queryFn: async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
        const response = await fetch(`${apiUrl}/api/auth/status`, {
          credentials: "include",
          headers: {
            "Accept": "application/json",
          }
        });

        if (!response.ok) {
          throw new Error("Failed to fetch auth status");
        }

        return await response.json();
      } catch (error) {
        console.error("Error checking auth status:", error);
        throw error;
      }
    },
    retry: 1, // Reduce retries for faster failure
    retryDelay: 500, // Faster retry
    staleTime: 30000,
    // Skip the API call if we already have local auth evidence
    enabled: !localAuth,
  });

  // Redirect to login if not authenticated
  React.useEffect(() => {
    // Only check API auth status if local auth check failed and API call completed
    if (!localAuth && !isLoading && (!authStatus?.authenticated || !authStatus?.user)) {
      setLocation("/login");
    }
  }, [authStatus, isLoading, localAuth, setLocation]);

  // Show loading state while checking auth
  if (isLoading && !localAuth) {
    return <LoadingPage />;
  }

  // Show chat if authenticated locally or via API
  return (localAuth || authStatus?.authenticated) ? <ChatDashboard /> : null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
      <Route path="/sign-up" component={SignUpPage} />
      <Route path="/welcome" component={WelcomePage} />
      <Route path="/auth-loading" component={LoadingPage} />
      <Route path="/chat" component={ProtectedChatDashboard} />
      <Route path="/test-riva" component={RivaTest} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location, setLocation] = useLocation();

  // Handle only logout functionality, no redirect checks
  useEffect(() => {
    // Check if this is a logout request
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('logout') || urlParams.has('force_logout')) {
      console.log("Logout detected, clearing user data");

      // Clear all auth data using centralized helper
      clearAuthData();

      // Forcefully reload the page to reset all state
      if (!urlParams.has('no_reload')) {
        window.location.href = '/';
        return;
      }

      // If we're on a path other than root, redirect to root
      if (location !== '/') {
        setLocation('/');
      }
    }
  }, [location, setLocation]);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    // Remove both theme classes first
    document.documentElement.classList.remove('light', 'dark');
    // Then add the correct one
    document.documentElement.classList.add(savedTheme);
  }, []);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <ThemeToggle />
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </div>
  );
}

export default App;
