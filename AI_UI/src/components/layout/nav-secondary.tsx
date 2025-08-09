"use client"

import React from 'react';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/blocks/sidebar';
import { cn } from '@/lib/utils';

interface NavSecondaryProps extends React.HTMLAttributes<HTMLDivElement> {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
    highlight?: boolean;
  }[];
}

export function NavSecondary({ items, className, ...props }: NavSecondaryProps) {
  const pathname = typeof window !== 'undefined' ? usePathname() : undefined;
  return (
    <div className={cn('py-6', className)} {...props}>
      <SidebarGroupLabel>General</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = !!pathname && (pathname === item.url || (item.url !== '/' && pathname.startsWith(item.url)));
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                data-active={isActive}
                className={cn(
                  item.highlight ? 'text-primary' : '',
                  // Visible ring on focus and when active
                  'rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  isActive && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
                )}
              >
                <Link href={item.url} aria-current={isActive ? 'page' : undefined} className="flex items-center">
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
}
