import { ReactNode } from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarProvider } from '@/components/blocks/sidebar';
import { ChatProvider } from '@/context/chat-context';
import { LanguageProvider } from '@/context/language-context';

export default function ProjectLayout({ children }: { children: ReactNode }) {
    return (
        <LanguageProvider>
            <ChatProvider>
                <SidebarProvider>
                    <div className="flex h-screen w-full">
                        <AppSidebar />
                        <main className="flex-1 overflow-auto">
                            {children}
                        </main>
                    </div>
                </SidebarProvider>
            </ChatProvider>
        </LanguageProvider>
    );
}
