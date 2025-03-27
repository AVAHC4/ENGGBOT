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
import { ThemeToggle } from "./components/ThemeToggle";
import { useEffect } from "react";

// Wrap the ChatDashboard component to handle authentication
function ProtectedChatDashboard() {
  const [, setLocation] = useLocation();
  
  // Check authentication status
  const { data: authStatus, isLoading } = useQuery({
    queryKey: ["auth-status"],
    queryFn: async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
        console.log("Checking auth status at:", apiUrl);
        
        const response = await fetch(`${apiUrl}/api/auth/status`, {
          credentials: "include",
          headers: {
            "Accept": "application/json",
          }
        });

        if (!response.ok) {
          throw new Error("Failed to fetch auth status");
        }

        const data = await response.json();
        console.log("Auth status response:", data);
        return data;
      } catch (error) {
        console.error("Error checking auth status:", error);
        throw error;
      }
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 30000,
  });

  useEffect(() => {
    // Check for auth success cookie
    const authSuccess = document.cookie.includes('auth_success=true');
    if (authSuccess) {
      console.log("Found auth success cookie");
      document.cookie = 'auth_success=; max-age=0; path=/';
    }

    if (!isLoading && (!authStatus?.authenticated || !authStatus?.user)) {
      console.log("Not authenticated, redirecting to login");
      setLocation("/login");
    }
  }, [authStatus, isLoading, setLocation]);

  if (isLoading) {
    return <LoadingPage />;
  }

  return authStatus?.authenticated ? <ChatDashboard /> : null;
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [, setLocation] = useLocation();

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.classList.add(savedTheme);
    
    // Check if we should redirect to chat
    const redirectToChat = localStorage.getItem('redirectToChat');
    if (redirectToChat) {
      // Clear the flag
      localStorage.removeItem('redirectToChat');
      // Navigate to chat
      setLocation('/chat');
    }
    
    // Check for auth success cookie
    const authSuccess = document.cookie.includes('auth_success=true');
    if (authSuccess) {
      console.log("Found auth success cookie in App");
      document.cookie = 'auth_success=; max-age=0; path=/';
      setLocation('/chat');
    }
  }, [setLocation]);

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
