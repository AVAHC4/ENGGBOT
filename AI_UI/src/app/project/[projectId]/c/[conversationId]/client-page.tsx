'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/chat-interface';
import { useChat } from '@/context/chat-context';
import { loadProjectConversation, saveProjectConversation } from '@/lib/storage';
import { Loader } from '@/components/ui/loader';

interface ProjectConversationPageClientProps {
    projectId: string;
    conversationId: string;
}

export default function ProjectConversationPageClient({ projectId, conversationId }: ProjectConversationPageClientProps) {

    const {
        messages,
        setMessages,
        setCurrentProjectId,
        isGenerating
    } = useChat();

    const [isLoaded, setIsLoaded] = useState(false);
    const prevMessagesLengthRef = useRef(0);

    useEffect(() => {
        if (projectId) {
            setCurrentProjectId(projectId);
        }

        return () => {
            setCurrentProjectId(null);
        };
    }, [projectId, setCurrentProjectId]);

    useEffect(() => {
        if (!projectId || !conversationId) return;

        setIsLoaded(false);

        const loadMessages = async () => {
            const msgs = await loadProjectConversation(projectId, conversationId);
            if (msgs && msgs.length > 0) {
                setMessages(msgs);
                prevMessagesLengthRef.current = msgs.length;
            } else {
                setMessages([]);
                prevMessagesLengthRef.current = 0;
            }
            setIsLoaded(true);
        };

        loadMessages();
    }, [projectId, conversationId, setMessages]);

    useEffect(() => {
        if (!isLoaded || !projectId || !conversationId) return;
        if (isGenerating) return;
        if (messages.length === 0) return;

        if (messages.length !== prevMessagesLengthRef.current) {
            prevMessagesLengthRef.current = messages.length;
            saveProjectConversation(projectId, conversationId, messages);
        }
    }, [messages, projectId, conversationId, isLoaded, isGenerating]);

    const customHeader = (
        <div className="flex items-center gap-2 p-4 border-b border-border/50">
            { }
            <Link href={`/AI_UI/project/${projectId}`}>
                <Button variant="ghost" size="sm" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Project</span>
                </Button>
            </Link>
        </div>
    );

    if (!isLoaded) {
        return (
            <main className="min-h-screen chat-page overflow-hidden">
                <div className="flex-1 flex flex-col">
                    {customHeader}
                    <div className="flex-1 flex items-center justify-center">
                        <Loader variant="bars" size="xl" intent="primary" />
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen chat-page overflow-hidden">
            <div className="flex-1">
                <ChatInterface customHeader={customHeader} />
            </div>
        </main>
    );
}
