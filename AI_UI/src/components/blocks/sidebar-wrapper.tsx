import React from "react";
import { SidebarProvider as OriginalSidebarProvider } from "./sidebar";

interface SidebarWrapperProps {
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function SidebarWrapper({ defaultOpen, className, children }: SidebarWrapperProps) {
  // @ts-ignore - Ignoring the type compatibility issue
  return <OriginalSidebarProvider defaultOpen={defaultOpen} className={className}>{children}</OriginalSidebarProvider>;
} 