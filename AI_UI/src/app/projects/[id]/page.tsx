"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProjectAsync } from "@/lib/projects/storage";
import { Project } from "@/lib/projects/types";
import { ChatInterface } from "@/components/chat-interface";
import { ChatProvider, useChat } from "@/context/chat-context";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ConversationMeta {
    id: string;
    title: string;
    updated: string;
}

function ProjectConversationsView({
    project,
    conversations: initialConversations,
    onRefresh
}: {
    project: Project;
    conversations: ConversationMeta[];
    onRefresh: () => void;
}) {
    const router = useRouter();
    const { switchConversation, startNewConversation, conversationId } = useChat();
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [conversations, setConversations] = useState(initialConversations);

    // Update conversations when initialConversations changes
    useEffect(() => {
        setConversations(initialConversations);
    }, [initialConversations]);

    const handleSelectConversation = (convId: string) => {
        switchConversation(convId);
        setSelectedConversationId(convId);
    };

    const handleNewConversation = () => {
        startNewConversation();
        // Use the conversationId from context after starting - it will be updated
        // Wait a tick for the state to update, then select
        setTimeout(() => {
            setSelectedConversationId('new');
        }, 50);
    };

    const handleBackFromChat = () => {
        setSelectedConversationId(null);
        // Refresh the conversations list to pick up the new conversation
        onRefresh();
    };

    // Format timestamp for display
    const formatTime = (timestamp: string) => {
        try {
            return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
        } catch {
            return 'Unknown';
        }
    };

    // If a conversation is selected, show the chat interface
    if (selectedConversationId) {
        const CustomHeader = (
            <div className="flex items-center justify-between w-full px-4 py-2">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={handleBackFromChat}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{project.emoji}</span>
                        <h1 className="text-lg font-semibold">{project.name}</h1>
                    </div>
                </div>
            </div>
        );

        return (
            <div className="relative h-screen w-full overflow-hidden">
                <ChatInterface customHeader={CustomHeader} />
            </div>
        );
    }

    // Show conversation list
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/projects")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <span className="text-3xl">{project.emoji}</span>
                    <div>
                        <h1 className="text-xl font-bold">{project.name}</h1>
                        <p className="text-sm text-muted-foreground">
                            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <Button onClick={handleNewConversation} className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Chat
                </Button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto p-6">
                {conversations.length > 0 ? (
                    <div className="space-y-2">
                        {conversations.map((convo) => (
                            <button
                                key={convo.id}
                                onClick={() => handleSelectConversation(convo.id)}
                                className={cn(
                                    "w-full text-left p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors",
                                    "flex items-center gap-4"
                                )}
                            >
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <MessageSquare className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium truncate">{convo.title || 'Untitled'}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {formatTime(convo.updated)}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
                        <p className="text-muted-foreground mb-4">Start a new chat to begin working in this project</p>
                        <Button onClick={handleNewConversation} className="gap-2">
                            <Plus className="h-4 w-4" />
                            New Chat
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ProjectPage() {
    const params = useParams();
    const router = useRouter();
    const [project, setProject] = useState<Project | null>(null);
    const [conversations, setConversations] = useState<ConversationMeta[]>([]);
    const [loading, setLoading] = useState(true);

    const loadProjectData = useCallback(async () => {
        if (params && params.id) {
            const projectId = Array.isArray(params.id) ? params.id[0] : params.id;
            const foundProject = await getProjectAsync(projectId);
            setProject(foundProject);

            // Load conversation metadata for this project's conversations
            if (foundProject && foundProject.conversationIds.length > 0) {
                try {
                    const convPromises = foundProject.conversationIds.map(async (convId) => {
                        const res = await fetch(`/api/conversations/${convId}?email=${encodeURIComponent(localStorage.getItem('user_email') || '')}`);
                        if (res.ok) {
                            const data = await res.json();
                            return {
                                id: convId,
                                title: data.conversation?.title || 'Untitled',
                                updated: data.conversation?.updated_at || data.conversation?.created_at || ''
                            };
                        }
                        return { id: convId, title: 'Untitled', updated: '' };
                    });
                    const convos = await Promise.all(convPromises);
                    // Sort by updated time (newest first)
                    convos.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
                    setConversations(convos);
                } catch (error) {
                    console.error('Error loading conversations:', error);
                }
            } else {
                setConversations([]);
            }

            setLoading(false);
        }
    }, [params]);

    useEffect(() => {
        loadProjectData();
    }, [loadProjectData]);

    const handleRefresh = useCallback(() => {
        // Reload project data to get updated conversationIds
        loadProjectData();
    }, [loadProjectData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <h1 className="text-2xl font-bold">Project not found</h1>
                <Button onClick={() => router.push("/projects")}>Back to Projects</Button>
            </div>
        );
    }

    return (
        <ChatProvider projectId={project.id}>
            <div className="relative h-screen w-full overflow-hidden">
                <ProjectConversationsView
                    project={project}
                    conversations={conversations}
                    onRefresh={handleRefresh}
                />
            </div>
        </ChatProvider>
    );
}
