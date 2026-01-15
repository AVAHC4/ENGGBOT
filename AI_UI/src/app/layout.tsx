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
 
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { BackgroundProvider } from "@/context/background-context";
import { Analytics } from "@vercel/analytics/react";
import { BackgroundRenderer } from "@/components/background/background-renderer";
import { LanguageProvider } from "@/context/language-context";



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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <LanguageProvider>
            <BackgroundProvider>
              { }
              <BackgroundRenderer />
              <ChatProvider>
                <SidebarWrapper defaultOpen={true}>
                  <div className="grid min-h-screen w-full lg:grid-cols-[200px_1fr] sidebar-container border-none">
                    <AppSidebar className="hidden lg:block border-none" />
                    <main className="transition-all duration-300 w-full p-0 m-0 border-none">{children}</main>
                  </div>
                  <ProfileVisibilityFixer />
                </SidebarWrapper>
              </ChatProvider>
            </BackgroundProvider>
          </LanguageProvider>
        </ThemeProvider>
        { } { }
        <Analytics />
      </body>
    </html>
  );
}
