import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import "./sidebar-fixes.css";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarWrapper } from "@/components/blocks/sidebar-wrapper";
import { ThemeProvider } from "@/providers/theme-provider";
import { ChatProvider } from "@/context/chat-context";
import { ProfileVisibilityFixer } from "@/components/layout/profile-visibility-fixer";
// import { Toaster } from "@/components/ui/toaster"; // Temporarily commented out due to React type compatibility issues
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { BackgroundProvider } from "@/context/background-context";
import { BackgroundRenderer } from "@/components/background/background-renderer";



export const metadata: Metadata = {
  title: "AI Chat Interface",
  description: "Interactive AI chat assistant built with Next.js and shadcn UI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <BackgroundProvider>
            {/* Global background renderer driven by settings */}
            <BackgroundRenderer />
            <ChatProvider>
              <SidebarWrapper defaultOpen={true}>
                <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr] sidebar-container border-none">
                  <AppSidebar className="hidden lg:block border-none" />
                  <main className="transition-all duration-300 w-full border-none">{children}</main>
                </div>
                <ProfileVisibilityFixer />
              </SidebarWrapper>
            </ChatProvider>
          </BackgroundProvider>
        </ThemeProvider>
        {/* <Toaster /> */} {/* Temporarily commented out due to React type compatibility issues */}
      </body>
    </html>
  );
}
