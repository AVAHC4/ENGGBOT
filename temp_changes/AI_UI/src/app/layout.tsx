import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./sidebar-fixes.css";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider } from "@/components/blocks/sidebar";
import { ThemeProvider } from "@/providers/theme-provider";
import { ChatProvider } from "@/context/chat-context";
import { ProfileVisibilityFixer } from "@/components/layout/profile-visibility-fixer";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ENGGBOT",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ChatProvider>
            <SidebarProvider>
              <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr] sidebar-container border-none">
                <AppSidebar className="hidden lg:block border-none" />
                <main className="transition-all duration-300 w-full border-none">{children}</main>
              </div>
              <ProfileVisibilityFixer />
            </SidebarProvider>
          </ChatProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
