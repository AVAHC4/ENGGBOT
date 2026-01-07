"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChatInterface } from "@/components/chat-interface";
import { useChat } from "@/context/chat-context";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Plus, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConversationMeta {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

interface ProjectMeta {
    id: string;
    name: string;
    emoji: string;
}

// Hook to fetch project conversations
function useProjectConversations(projectId: string | null) {
    const [project, setProject] = useState<ProjectMeta | null>(null);
    const [conversations, setConversations] = useState<ConversationMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!projectId || projectId.startsWith('temp_')) {
            setLoading(false);
            return;
        }

        try {
            const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
            const email = userData?.email || '';

            if (!email) {
                setError('No user email found');
                setLoading(false);
                return;
            }

            const response = await fetch(
                `/api/projects/${projectId}/conversations?email=${encodeURIComponent(email)}`
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch project data');
            }

            const data = await response.json();
            setProject(data.project);
            setConversations(data.conversations);
            setError(null);
        } catch (err: any) {
            console.error('[ProjectPage] Error fetching data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const refetch = useCallback(() => {
        setLoading(true);
        fetchData();
    }, [fetchData]);

    const removeConversation = useCallback((convId: string) => {
        setConversations(prev => prev.filter(c => c.id !== convId));
    }, []);

    return { project, conversations, loading, error, refetch, removeConversation };
}

// Helper to format time
function formatTime(timestamp: string) {
    try {
        return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
        return 'Unknown';
    }
}

export default function ProjectPage() {
    const params = useParams();
    const router = useRouter();
    const { setProjectId, switchConversation, startNewConversation } = useChat();

    const [projectId, setLocalProjectId] = useState<string | null>(null);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [conversationToDelete, setConversationToDelete] = useState<ConversationMeta | null>(null);

    // Extract project ID from params
    useEffect(() => {
        if (params?.id) {
            const id = Array.isArray(params.id) ? params.id[0] : params.id;
            setLocalProjectId(id);
            setProjectId(id);
        }
    }, [params, setProjectId]);

    // Fetch project data
    const { project, conversations, loading, error, refetch, removeConversation } = useProjectConversations(projectId);

    // Handle conversation selection
    const handleSelectConversation = (convId: string) => {
        switchConversation(convId);
        setSelectedConversationId(convId);
    };

    // Handle new conversation
    const handleNewConversation = () => {
        startNewConversation();
        setTimeout(() => setSelectedConversationId('new'), 50);
    };

    // Handle back from chat
    const handleBackFromChat = () => {
        setSelectedConversationId(null);
        refetch();
    };

    // Handle delete conversation
    const handleDeleteConversation = async (convId: string) => {
        // Optimistic update
        removeConversation(convId);

        try {
            const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
            const email = userData?.email || '';

            if (!email) return;

            const response = await fetch(
                `/api/conversations/${convId}?email=${encodeURIComponent(email)}`,
                { method: 'DELETE' }
            );

            if (!response.ok) {
                console.error('[ProjectPage] Failed to delete conversation');
                refetch(); // Restore on failure
            }
        } catch (err) {
            console.error('[ProjectPage] Error deleting conversation:', err);
            refetch();
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Error state
    if (error || !project) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <h1 className="text-2xl font-bold">Project not found</h1>
                <p className="text-muted-foreground">{error}</p>
                <Button onClick={() => router.push("/projects")}>Back to Projects</Button>
            </div>
        );
    }

    // Chat view when conversation is selected
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

    // Conversations list view
    return (
        <div className="flex flex-col h-screen">
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
                            <div
                                key={convo.id}
                                className={cn(
                                    "w-full text-left p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors",
                                    "flex items-center gap-4 group"
                                )}
                            >
                                <button
                                    onClick={() => handleSelectConversation(convo.id)}
                                    className="flex items-center gap-4 flex-1 min-w-0"
                                >
                                    <div className="p-2 rounded-lg bg-primary/10">
                                        <MessageSquare className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <h3 className="font-medium truncate">{convo.title}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {formatTime(convo.updatedAt)}
                                        </p>
                                    </div>
                                </button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setConversationToDelete(convo);
                                        setDeleteDialogOpen(true);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
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

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{conversationToDelete?.title || 'Untitled'}&quot;?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                if (conversationToDelete) {
                                    handleDeleteConversation(conversationToDelete.id);
                                }
                                setDeleteDialogOpen(false);
                                setConversationToDelete(null);
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
