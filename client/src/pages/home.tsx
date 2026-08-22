import HeroSection from "@/components/hero-section";
import FeaturesSection from "@/components/features-section";
import ContentSection from "@/components/content-section";
import FooterSection from "@/components/footer";
import React, { useEffect, useState } from "react";
import { isAuthenticated, shouldRedirectToChat } from "@/lib/auth-storage";
import BackgroundPaths from "@/components/background-paths";
import { BrandedLoader } from "@/components/branded-loader";
import { motion, Variants } from "framer-motion";

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

export default function Home() {
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    let redirectTimer: number | undefined;
    let redirectStarted = false;

    const startRedirect = (destination: string) => {
      if (redirectStarted) return;

      redirectStarted = true;
      setRedirecting(true);

      // Let the branded animation render before handing control to the AI app.
      redirectTimer = window.setTimeout(() => {
        window.location.replace(destination);
      }, 1200);
    };

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return;
    }


    const urlParams = new URLSearchParams(window.location.search);
    const forcedMain = localStorage.getItem("forceMainPage") === "true";
    const forcedLogout = localStorage.getItem("forceLogout") === "true";
    const hasLogoutParams = urlParams.has("logout") || urlParams.has("force_logout");

    if (forcedMain || forcedLogout || hasLogoutParams) {

      localStorage.removeItem("forceMainPage");
      localStorage.removeItem("forceLogout");
      return;
    }

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
      startRedirect("/AI_UI");
      return () => {
        if (redirectTimer) window.clearTimeout(redirectTimer);
      };
    }


    const controller = new AbortController();
    const checkAuth = async () => {
      try {
        const apiUrl = window.location.origin;
        const res = await fetch(`${apiUrl}/api/auth/status`, {
          credentials: "include",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.authenticated) {
          startRedirect("/AI_UI");
        }
      } catch (_) {

      }
    };
    checkAuth();

    return () => {
      controller.abort();
      if (redirectTimer) window.clearTimeout(redirectTimer);
    };
  }, []);

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,_rgb(76_29_149_/_0.22),_transparent_36%),_#030303] px-6">
        <BrandedLoader message="Redirecting to your chat…" detail="Getting your workspace ready" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <BackgroundPaths />
      <div className="relative z-10 container mx-auto px-4 md:px-0">
        <HeroSection />

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}>
          <ContentSection />
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}>
          <FeaturesSection />
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeInUp}>
          <FooterSection />
        </motion.div>
      </div>
    </div>
  );
}
