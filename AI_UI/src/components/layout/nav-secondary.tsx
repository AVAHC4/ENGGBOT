import React from 'react';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/blocks/sidebar';
import { cn } from '@/lib/utils';
import { Moon } from 'lucide-react';

interface NavSecondaryProps extends React.HTMLAttributes<HTMLDivElement> {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
    highlight?: boolean;
  }[];
}

export function NavSecondary({ items, className, ...props }: NavSecondaryProps) {
  // Add theme settings at the top with highlight
  const settingsItems = [
    {
      title: "Theme Settings",
      url: "/examples/forms/appearance",
      icon: Moon,
      highlight: true
    },
    ...items
  ];

  return (
    <div className={cn('py-6', className)} {...props}>
      <SidebarGroupLabel>General</SidebarGroupLabel>
      <SidebarMenu>
        {settingsItems.map((item) => {
          const Icon = item.icon;
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild className={item.highlight ? "text-primary" : ""}>
                <Link href={item.url} className="flex items-center">
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </div>
  );
} // Fixed theme settings removal
