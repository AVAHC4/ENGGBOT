'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, MessageSquare, Plus, Pencil, Trash2, MoreVertical, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { loadProjectConversations, createProjectConversation, deleteProjectConversation, renameProject } from '@/lib/storage';

interface ProjectConversation {
    id: string;
    title: string;
    created: string;
    updated: string;
}

interface Project {
    id: string;
    name: string;
    description?: string;
}

interface ProjectPageClientProps {
    projectId: string;
}

export default function ProjectPageClient({ projectId }: ProjectPageClientProps) {
    const router = useRouter();
    // Removed useParams as we receive projectId from props

    const [project, setProject] = useState<Project | null>(null);
    const [conversations, setConversations] = useState<ProjectConversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [conversationToDelete, setConversationToDelete] = useState<ProjectConversation | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Load project data
    useEffect(() => {
        if (!projectId) {
            console.log('[ProjectPageClient] No project ID provided');
            return;
        }

        const loadData = async () => {
            console.log('[ProjectPageClient] Starting loadData for:', projectId);
            setLoading(true);
            setError(null); // Clear previous errors

            // Get project details
            const userDataStr = localStorage.getItem('user_data');
            const userData = userDataStr ? JSON.parse(userDataStr) : {};
            const email = userData.email?.toLowerCase() || localStorage.getItem('user_email')?.toLowerCase();

            console.log('[ProjectPageClient] User email:', email);

            if (!email) {
                console.error('[ProjectPageClient] No user email found');
                setError('Please log in to view this project');
                setLoading(false);
                return;
            }

            try {
                console.log('[ProjectPageClient] Fetching project details...');
                const response = await fetch(`/api/projects/${projectId}?email=${encodeURIComponent(email)}`);
                console.log('[ProjectPageClient] Project fetch status:', response.status);

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || `Failed to load project (Status: ${response.status})`);
                }

                const data = await response.json();
                console.log('[ProjectPageClient] Project data received:', data);

                if (!data.project) {
                    throw new Error('Project data missing in response');
                }

                setProject({
                    id: data.project.id,
                    name: data.project.name,
                    description: data.project.description,
                });

                console.log('[ProjectPageClient] Fetching conversations...');
                const convos = await loadProjectConversations(projectId);
                console.log('[ProjectPageClient] Conversations loaded:', convos.length);
                setConversations(convos);
            } catch (err: any) {
                console.error('[ProjectPageClient] Error loading project:', err);
                setError(err.message || 'Failed to load project. Please check your connection.');
            } finally {
                setLoading(false);
            }
        };

        loadData();

        // Listen for updates
        const handleUpdate = () => {
            console.log('[ProjectPageClient] projectUpdated event received, reloading...');
            loadData();
        };
        window.addEventListener('projectUpdated', handleUpdate);
        return () => window.removeEventListener('projectUpdated', handleUpdate);
    }, [projectId]);

    // Handle new conversation in project
    const handleNewConversation = async () => {
        const convo = await createProjectConversation(projectId);
        if (convo) {
            setConversations(prev => [convo, ...prev]);
            // Navigate to the project conversation
            router.push(`/project/${projectId}/c/${convo.id}`);
        }
    };

    // Handle rename project
    const handleRename = async () => {
        if (!newName.trim() || !project) {
            setIsRenaming(false);
            return;
        }

        await renameProject(projectId, newName.trim());
        setProject(prev => prev ? { ...prev, name: newName.trim() } : null);
        setIsRenaming(false);
    };

    // Handle delete conversation
    const confirmDeleteConversation = async () => {
        if (!conversationToDelete) return;

        await deleteProjectConversation(projectId, conversationToDelete.id);
        setConversations(prev => prev.filter(c => c.id !== conversationToDelete.id));
        setShowDeleteModal(false);
        setConversationToDelete(null);
    };

    // Format timestamp
    const formatTime = (timestamp: string) => {
        try {
            return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
        } catch {
            return '';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-muted-foreground">{error || 'Project not found'}</p>
                <Link href="/AI_UI">
                    <Button variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Chat
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto px-4 py-8">
            {/* Project Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/AI_UI">
                    <Button variant="ghost" size="icon" className="mr-2">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>

                <FolderOpen className="h-8 w-8 text-primary" />

                {isRenaming ? (
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename();
                            if (e.key === 'Escape') setIsRenaming(false);
                        }}
                        onBlur={handleRename}
                        autoFocus
                        className="text-2xl font-bold bg-transparent border-b border-primary focus:outline-none"
                    />
                ) : (
                    <h1 className="text-2xl font-bold">{project.name}</h1>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => {
                            setNewName(project.name);
                            setIsRenaming(true);
                        }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Rename
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* New Chat Input */}
            <div
                onClick={handleNewConversation}
                className="flex items-center gap-3 p-4 mb-6 rounded-xl border border-border hover:border-primary/50 cursor-pointer transition-colors bg-card"
            >
                <Plus className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">New chat in {project.name}</span>
            </div>

            {/* Conversations List */}
            <div className="flex flex-col gap-2">
                {conversations.length > 0 ? (
                    conversations.map((convo) => (
                        <div
                            key={convo.id}
                            className="group flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            // Corrected path to root project
                            onClick={() => router.push(`/project/${projectId}/c/${convo.id}`)}
                        >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <MessageSquare className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{convo.title}</p>
                                    <p className="text-sm text-muted-foreground truncate">
                                        {formatTime(convo.updated || convo.created)}
                                    </p>
                                </div>
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConversationToDelete(convo);
                                            setShowDeleteModal(true);
                                        }}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No conversations yet</p>
                        <p className="text-sm">Start a new chat in this project</p>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && conversationToDelete && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
                    onClick={() => setShowDeleteModal(false)}
                >
                    <div
                        className="bg-background p-6 rounded-lg shadow-lg max-w-md mx-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-semibold mb-2">Delete Conversation?</h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            This conversation will be permanently deleted. This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={confirmDeleteConversation}>
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
