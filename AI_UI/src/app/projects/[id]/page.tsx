"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProjectAsync } from "@/lib/projects/storage";
import { Project } from "@/lib/projects/types";
import { ChatInterface } from "@/components/chat-interface";
import { ChatProvider, useChat } from "@/context/chat-context";
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
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [conversationToDelete, setConversationToDelete] = useState<ConversationMeta | null>(null);

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

    const handleDeleteConversation = async (convId: string) => {
        try {
            // Get email from user_data (consistent with rest of app)
            const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
            const email = userData?.email || localStorage.getItem('user_email') || '';

            if (!email) {
                console.error('No email found for delete operation');
                return;
            }

            console.log('[Delete] Deleting conversation:', convId, 'for email:', email);
            const response = await fetch(`/api/conversations/${convId}?email=${encodeURIComponent(email)}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                console.log('[Delete] Successfully deleted conversation from database');
                // Remove from local state immediately
                setConversations(prev => prev.filter(c => c.id !== convId));
                // Also refresh to sync with server
                onRefresh();
            } else {
                const errorData = await response.json();
                console.error('[Delete] Failed to delete:', response.status, errorData);
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
        }
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
                                        <h3 className="font-medium truncate">{convo.title || 'Untitled'}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {formatTime(convo.updated)}
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

export default function ProjectPage() {
    const params = useParams();
    const router = useRouter();
    const [project, setProject] = useState<Project | null>(null);
    const [conversations, setConversations] = useState<ConversationMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [projectId, setProjectId] = useState<string | null>(null);

    // Handle temporary ID detection and real ID updates
    useEffect(() => {
        if (params && params.id) {
            const id = Array.isArray(params.id) ? params.id[0] : params.id;
            setProjectId(id);

            // If this is a temporary ID, create an optimistic project immediately
            if (id.startsWith('temp_')) {
                // Get project name from sessionStorage if available
                const storedName = sessionStorage.getItem(`project_name_${id}`);
                const optimisticProject: Project = {
                    id: id,
                    name: storedName || 'New Project',
                    emoji: '📁',
                    created: new Date().toISOString(),
                    updated: new Date().toISOString(),
                    conversationIds: [],
                    fileIds: [],
                };
                setProject(optimisticProject);
                setConversations([]);
                setLoading(false);
            }
        }
    }, [params]);

    // Listen for project ID updates (when temp ID is replaced with real ID)
    useEffect(() => {
        const handleProjectIdUpdate = (event: CustomEvent<{ tempId: string; realId: string }>) => {
            if (projectId && projectId === event.detail.tempId) {
                // Update local state with real ID
                setProjectId(event.detail.realId);
                setProject(prev => prev ? { ...prev, id: event.detail.realId } : null);
            }
        };

        window.addEventListener('projectIdUpdated', handleProjectIdUpdate as EventListener);
        return () => {
            window.removeEventListener('projectIdUpdated', handleProjectIdUpdate as EventListener);
        };
    }, [projectId]);

    const loadProjectData = useCallback(async () => {
        if (!projectId) return;

        // Don't try to load from API if this is a temp ID
        if (projectId.startsWith('temp_')) {
            // Project is already set optimistically, just wait for real ID
            return;
        }

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
    }, [projectId]);

    useEffect(() => {
        if (projectId && !projectId.startsWith('temp_')) {
            loadProjectData();
        }
    }, [projectId, loadProjectData]);

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

