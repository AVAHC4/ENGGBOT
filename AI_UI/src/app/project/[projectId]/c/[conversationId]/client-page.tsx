'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ChatInterface } from '@/components/chat-interface';
import { ThemeSwitch } from '@/components/ui/theme-switch';
import { useChat } from '@/context/chat-context';
import {
    getCachedProjectConversation,
    loadProjectConversation,
    saveProjectConversation,
} from '@/lib/storage';
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
    const isGeneratingRef = useRef(isGenerating);
    const dirtyConversationRef = useRef(false);
    const loadedConversationKeyRef = useRef<string | null>(null);

    useEffect(() => {
        isGeneratingRef.current = isGenerating;
        if (isGenerating) {
            dirtyConversationRef.current = true;
        }
    }, [isGenerating]);

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

        let cancelled = false;
        const activeKey = `${projectId}:${conversationId}`;
        loadedConversationKeyRef.current = null;
        dirtyConversationRef.current = false;

        const cached = getCachedProjectConversation(projectId, conversationId);
        if (cached !== null) {
            setMessages(cached);
            prevMessagesLengthRef.current = cached.length;
            loadedConversationKeyRef.current = activeKey;
            setIsLoaded(true);

            loadProjectConversation(projectId, conversationId, (freshMessages) => {
                if (cancelled || isGeneratingRef.current || dirtyConversationRef.current) return;
                setMessages(freshMessages);
                prevMessagesLengthRef.current = freshMessages.length;
            });

            return () => {
                cancelled = true;
            };
        }

        setIsLoaded(false);

        const loadMessages = async () => {
            const msgs = await loadProjectConversation(projectId, conversationId);
            if (cancelled) return;
            if (msgs && msgs.length > 0) {
                setMessages(msgs);
                prevMessagesLengthRef.current = msgs.length;
            } else {
                setMessages([]);
                prevMessagesLengthRef.current = 0;
            }
            loadedConversationKeyRef.current = activeKey;
            setIsLoaded(true);
        };

        loadMessages();

        return () => {
            cancelled = true;
        };
    }, [projectId, conversationId, setMessages]);

    useEffect(() => {
        if (!isLoaded || !projectId || !conversationId) return;
        if (loadedConversationKeyRef.current !== `${projectId}:${conversationId}`) return;
        if (isGenerating) return;
        if (messages.length === 0) return;

        if (messages.length !== prevMessagesLengthRef.current) {
            dirtyConversationRef.current = true;
            prevMessagesLengthRef.current = messages.length;
            saveProjectConversation(projectId, conversationId, messages);
        }
    }, [messages, projectId, conversationId, isLoaded, isGenerating]);

    if (!isLoaded) {
        return (
            <main className="min-h-screen chat-page overflow-hidden">
                <div className="absolute top-4 right-4 z-10 hidden md:block">
                    <ThemeSwitch variant="circle" start="top-right" />
                </div>

                <div className="flex-1 flex items-center justify-center min-h-screen">
                    <Loader variant="bars" size="xl" intent="primary" />
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen chat-page overflow-hidden">
            <div className="absolute top-4 right-4 z-10 hidden md:block">
                <ThemeSwitch variant="circle" start="top-right" />
            </div>

            <div className="flex-1">
                <ChatInterface />
            </div>
        </main>
    );
}
