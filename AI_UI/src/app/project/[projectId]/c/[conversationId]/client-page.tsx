'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/chat-interface';
import { useChat } from '@/context/chat-context';
import { loadProjectConversation, saveProjectConversation } from '@/lib/storage';

interface ProjectConversationPageClientProps {
    projectId: string;
    conversationId: string;
}

export default function ProjectConversationPageClient({ projectId, conversationId }: ProjectConversationPageClientProps) {
    // Removed useParams as we receive projectId from props

    const {
        messages,
        setMessages,
        setCurrentProjectId,
        isGenerating
    } = useChat();

    const [isLoaded, setIsLoaded] = useState(false);
    const prevMessagesLengthRef = useRef(0);

    // Set project mode when entering this page, clear when leaving
    useEffect(() => {
        if (projectId) {
            setCurrentProjectId(projectId);
        }

        // Cleanup: clear project mode when leaving
        return () => {
            setCurrentProjectId(null);
        };
    }, [projectId, setCurrentProjectId]);

    // Load project conversation messages when page loads
    useEffect(() => {
        if (!projectId || !conversationId) return;

        const loadMessages = async () => {
            // Load messages from project conversation API
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

    // Auto-save messages when they change (for project conversations)
    // Only save when generation is complete and messages have changed
    useEffect(() => {
        if (!isLoaded || !projectId || !conversationId) return;
        if (isGenerating) return; // Don't save while generating
        if (messages.length === 0) return;

        // Only save if messages count changed (new message added)
        if (messages.length !== prevMessagesLengthRef.current) {
            prevMessagesLengthRef.current = messages.length;
            saveProjectConversation(projectId, conversationId, messages);
        }
    }, [messages, projectId, conversationId, isLoaded, isGenerating]);

    // Custom header with back button
    const customHeader = (
        <div className="flex items-center gap-2 p-4 border-b border-border/50">
            {/* KEEPING AI_UI PREFIX HERE */}
            <Link href={`/AI_UI/project/${projectId}`}>
                <Button variant="ghost" size="sm" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Project</span>
                </Button>
            </Link>
        </div>
    );

    return (
        <main className="min-h-screen chat-page overflow-hidden">
            <div className="flex-1">
                <ChatInterface customHeader={customHeader} />
            </div>
        </main>
    );
}
