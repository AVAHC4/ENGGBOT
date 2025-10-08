import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link } from "wouter"
import { AnimatedGroup } from "@/components/motion-primitives/animated-group"
import { TextEffect } from "@/components/motion-primitives/text-effect"
import React, { useEffect } from "react"
import { setRedirectToChat } from "@/lib/auth-storage"
import { ThemeToggle } from "@/components/theme-toggle"

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
}

// Preload critical resources before React even renders
if (typeof document !== 'undefined') {
  // Add resource hints in the document head
  const googleDomains = ['accounts.google.com', 'ssl.gstatic.com'];
  
  googleDomains.forEach(domain => {
    // DNS prefetch - start DNS resolution early
    const dnsPrefetch = document.createElement('link');
    dnsPrefetch.rel = 'dns-prefetch';
    dnsPrefetch.href = `https://${domain}`;
    document.head.appendChild(dnsPrefetch);
    
    // Preconnect - establish early connection
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = `https://${domain}`;
    preconnect.crossOrigin = 'anonymous';
    document.head.appendChild(preconnect);
  });
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [authError, setAuthError] = React.useState('');
  const [fastAuth, setFastAuth] = React.useState(false);
  // Central landing URL for cross-app navigation
  const mainLandingUrl = (import.meta.env.VITE_MAIN_LANDING_URL as string) || "/";
  
  // Check for errors and set up connection optimizations
  React.useEffect(() => {
    // Check for error in URL
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error) {
      setAuthError(`Authentication error: ${error}`);
      setIsLoading(false);
    }
    
    // Check if we've returned from a failed auth attempt
    const authCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth_attempt='));
      
    if (authCookie && !document.cookie.includes('auth_success=true')) {
      // Clear the cookie to prevent repeated checks
      document.cookie = "auth_attempt=; max-age=0; path=/";
    }
  }, []);

  // Pre-warm the connection to Google
  React.useEffect(() => {
    // Create hidden iframe to pre-establish connection
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = 'https://accounts.google.com/favicon.ico';
    document.body.appendChild(iframe);
    
    // Remove after connection is established
    return () => {
      document.body.removeChild(iframe);
    };
  }, []);

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    setAuthError('');
    setFastAuth(true);
    
    try {
      // Set a cookie to check later if we return here
      document.cookie = "auth_attempt=true; max-age=300; path=/";
      
      // Mark that we should redirect to chat when auth is successful
      setRedirectToChat(true);
      
      // Optimize API URL resolution
      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
      
      // Use sessionStorage instead of localStorage (faster)
      const state = Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('oauth_state', state);
      
      // Set a timeout to reset loading state if redirect takes too long
      const timeout = setTimeout(() => {
        setIsLoading(false);
        setFastAuth(false);
        setAuthError("Connection to Google is taking longer than expected. Please check your network and try again.");
      }, 8000); // Shorter timeout
      
      // Direct navigation to Google auth endpoint with the state parameter
      // Use clean URL construction to prevent double requests
      const googleAuthUrl = `${apiUrl}/api/auth/google?state=${state}&prompt=select_account`;
      
      // Use faster navigation method
      window.location.replace(googleAuthUrl);
      
      // Clear timeout if navigation happens quickly
      window.onbeforeunload = () => {
        clearTimeout(timeout);
      };
    } catch (err) {
      setIsLoading(false);
      setFastAuth(false);
      setAuthError("An unexpected error occurred. Please try again.");
      console.error("Google sign-in error:", err);
    }
  };

  // If in fast auth mode, show a minimal UI for faster performance
  if (fastAuth) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <svg className="animate-spin mx-auto h-12 w-12 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div className="text-white text-xl font-medium">Connecting to Google...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Home Button */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={() => (window.location.href = mainLandingUrl)}
          className="px-4 py-2 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-white font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-200 dark:border-gray-800"
        >
          Home
        </button>
      </div>

      {/* Theme Toggle Button */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <section className="flex min-h-screen items-center justify-center px-4 py-16 md:py-32">
        <AnimatedGroup variants={transitionVariants}>
          <form
            className="m-auto h-fit w-full max-w-[440px] overflow-hidden rounded-[14px] border shadow-md shadow-zinc-950/5 bg-white dark:bg-zinc-900"
          >
            <div className="bg-card -m-px rounded-[14px] border p-12 pb-10">
              <div className="text-center">
                <button
                  aria-label="go home"
                  className="mx-auto block w-fit"
                  onClick={() => (window.location.href = mainLandingUrl)}
                >
                  <div className="flex items-center space-x-2">
                    <Logo />
                    <span className="text-2xl font-bold">ENGGBOT</span>
                  </div>
                </button>
                <TextEffect
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  as="h1"
                  className="mb-1 mt-4 text-xl font-semibold"
                >
                  Sign In to ENGGBOT
                </TextEffect>
                <TextEffect
                  per="line"
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  delay={0.5}
                  as="p"
                  className="text-sm"
                >
                  Welcome back! Sign in to continue
                </TextEffect>
              </div>

              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="block text-sm">
                    Email
                  </Label>
                  <Input type="email" required name="email" id="email" className="h-12" />
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pwd" className="text-title text-sm">
                      Password
                    </Label>
                    <Button asChild variant="link" size="sm">
                      <Link href="#" className="link intent-info variant-ghost text-sm">
                        Forgot your Password?
                      </Link>
                    </Button>
                  </div>
                  <Input type="password" required name="pwd" id="pwd" className="h-12 input sz-md variant-mixed" />
                </div>

                <Button variant="default" className="w-full !bg-black !text-white hover:!bg-black/90 dark:!bg-white dark:!text-black dark:hover:!bg-white/90">Sign In</Button>
              </div>

              <div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <hr className="border-dashed" />
                <span className="text-muted-foreground text-xs">Or continue With</span>
                <hr className="border-dashed" />
              </div>

              {authError && (
                <div className="mb-4 p-2 text-center text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
                  {authError}
                </div>
              )}

              <div className="w-full">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Connecting to Google...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="0.98em" height="1em" viewBox="0 0 256 262" className="mr-2">
                        <path
                          fill="#4285f4"
                          d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                        ></path>
                        <path
                          fill="#34a853"
                          d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                        ></path>
                        <path
                          fill="#fbbc05"
                          d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"
                        ></path>
                        <path
                          fill="#eb4335"
                          d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                        ></path>
                      </svg>
                      <span>Google</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="p-3 bg-card border-t">
              <p className="text-accent-foreground text-center text-sm">
                Don't have an account?
                <Button asChild variant="link" className="text-accent-foreground text-center text-sm">
                  <Link href="/sign-up">Create account</Link>
                </Button>
              </p>
            </div>
          </form>
        </AnimatedGroup>
      </section>
    </div>
  )
} 
