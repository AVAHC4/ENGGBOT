import HeroSection from "@/components/hero-section";
import FeaturesSection from "@/components/features-section";
import ContentSection from "@/components/content-section";
import FooterSection from "@/components/footer";
import React, { useEffect, useState } from "react";
import { isAuthenticated, shouldRedirectToChat } from "@/lib/auth-storage";
import BackgroundPaths from "@/components/background-paths";
import { motion, Variants } from "framer-motion";

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

export default function Home() {
  // Removed automatic redirection to /AI_UI to keep the landing page visible.

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