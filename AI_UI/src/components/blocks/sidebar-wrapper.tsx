import React, { useState, useEffect } from "react";
import { SidebarProvider as OriginalSidebarProvider } from "./sidebar";

interface SidebarWrapperProps {
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function SidebarWrapper({ defaultOpen, className, children }: SidebarWrapperProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Toggle sidebar open/closed classes on the main container
  useEffect(() => {
    const sidebarContainer = document.querySelector('.sidebar-container');
    if (sidebarContainer) {
      if (isOpen) {
        sidebarContainer.classList.remove('sidebar-closed');
        sidebarContainer.classList.add('sidebar-open');
      } else {
        sidebarContainer.classList.remove('sidebar-open');
        sidebarContainer.classList.add('sidebar-closed');
      }
    }
  }, [isOpen]);

  // Handle open state changes
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  // @ts-ignore - Ignoring the type compatibility issue
  return (
    <OriginalSidebarProvider 
      defaultOpen={defaultOpen} 
      className={className} 
      onOpenChange={handleOpenChange}
    >
      {children}
    </OriginalSidebarProvider>
  );
} 