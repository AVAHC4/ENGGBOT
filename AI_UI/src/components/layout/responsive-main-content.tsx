import React from "react";
import { useSidebar } from "@/components/blocks/sidebar";
import { cn } from "@/lib/utils";

interface ResponsiveMainContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveMainContent({ children, className }: ResponsiveMainContentProps) {
  // Get sidebar state
  const { open } = useSidebar();

  return (
    <main 
      className={cn(
        "transition-all duration-300 w-full border-none",
        // When sidebar is closed, extend the content to the left with smooth transition
        !open && "lg:col-span-2 lg:ml-0",
        className
      )}
      style={{
        width: open ? '100%' : 'calc(100% + 280px)',
        marginLeft: open ? '0' : '-280px',
      }}
    >
      {children}
    </main>
  );
} 