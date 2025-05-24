import React from 'react';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/blocks/sidebar';

interface DocumentItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

interface NavDocumentsProps {
  items: DocumentItem[];
}

export function NavDocuments({ items }: NavDocumentsProps) {
  return (
    <div className="py-4">
      <div className="px-3 pb-1">
        <h2 className="mb-1 text-xs font-semibold text-muted-foreground">Documents</h2>
      </div>
      <SidebarMenu>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild data-active={false}>
                <Link href={item.url} className="flex items-center">
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </div>
  );
} 