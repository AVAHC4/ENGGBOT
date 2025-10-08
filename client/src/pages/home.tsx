import HeroSection from "@/components/hero-section";
import FeaturesSection from "@/components/features-section";
import ContentSection from "@/components/content-section";
import FooterSection from "@/components/footer";
import React, { useEffect, useState } from "react";
import { isAuthenticated, shouldRedirectToChat } from "@/lib/auth-storage";

export default function Home() {
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Skip auto-redirect if we just logged out or explicitly forced the main page
    const urlParams = new URLSearchParams(window.location.search);
    const forceMainParam = urlParams.has("force_main");
    const forcedMain = localStorage.getItem("forceMainPage") === "true";
    const forcedLogout = localStorage.getItem("forceLogout") === "true";
    const hasLogoutParams = urlParams.has("logout") || urlParams.has("force_logout");

    if (forcedMain || forcedLogout || hasLogoutParams || forceMainParam) {
      // Clear the flags so future visits behave normally
      localStorage.removeItem("forceMainPage");
      localStorage.removeItem("forceLogout");
      try { localStorage.removeItem("redirectToChat"); } catch {}
      if (forceMainParam) {
        urlParams.delete("force_main");
        const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : "");
        window.history.replaceState({}, "", newUrl);
      }
      return;
    }

    // Fast path: local evidence of auth or prior intent to go to chat
    const cookies = document.cookie || "";
    const aiUiAuthenticated = localStorage.getItem("ai_ui_authenticated") === "true";
    const externalAuthenticatedLS = localStorage.getItem("authenticated") === "true";
    const externalAuthenticatedSS = sessionStorage.getItem("authenticated") === "true";
    const hasUserData = !!localStorage.getItem("user_data") || !!localStorage.getItem("auth_user_data");
    const hasAuthCookie = cookies.includes("auth_success=true") || cookies.includes("authenticated=true");

    if (
      isAuthenticated() ||
      shouldRedirectToChat() ||
      aiUiAuthenticated ||
      externalAuthenticatedLS ||
      externalAuthenticatedSS ||
      hasUserData ||
      hasAuthCookie
    ) {
      setRedirecting(true);
      window.location.replace("/AI_UI");
      return;
    }

    // Fallback path: ask the backend if the session is authenticated
    const controller = new AbortController();
    const checkAuth = async () => {
      try {
        const apiUrl = window.location.origin; // vercel.json rewrites /api/* to the AI_UI deployment
        const res = await fetch(`${apiUrl}/api/auth/status`, {
          credentials: "include",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.authenticated) {
          setRedirecting(true);
          window.location.replace("/AI_UI");
        }
      } catch (_) {
        // ignore – show landing
      }
    };
    checkAuth();

    return () => controller.abort();
  }, []);

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-t-2 border-b-2 border-white rounded-full animate-spin mx-auto mb-4" />
          <p>Redirecting to your chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <HeroSection />
      <ContentSection />
      <FeaturesSection />
      <FooterSection />
    </div>
  );
}