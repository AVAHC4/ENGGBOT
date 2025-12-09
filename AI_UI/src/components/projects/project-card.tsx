"use client";

import * as React from "react";
import { MoreVertical, Pencil, Trash2, FolderOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Project } from "@/lib/projects/types";
import { getProjectStats } from "@/lib/projects/storage";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
    project: Project;
    onOpen?: (project: Project) => void;
    onEdit?: (project: Project) => void;
    onDelete?: (project: Project) => void;
}

export function ProjectCard({ project, onOpen, onEdit, onDelete }: ProjectCardProps) {
    const [stats, setStats] = React.useState<{
        conversationCount: number;
        fileCount: number;
        totalFileSize: number;
    } | null>(null);

    React.useEffect(() => {
        async function loadStats() {
            const projectStats = await getProjectStats(project.id);
            setStats(projectStats);
        }
        loadStats();
    }, [project.id]);

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    };

    return (
        <div
            onClick={() => onOpen?.(project)}
            className={cn(
                "group relative flex items-center gap-3 rounded-lg p-3 transition-all cursor-pointer",
                "hover:bg-accent border-l-4",
                "min-h-[60px]"
            )}
            style={{ borderLeftColor: project.color || '#3b82f6' }}
        >
            {/* Emoji and Content */}
            <div className="text-xl flex-shrink-0">{project.emoji}</div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium text-sm truncate">{project.name}</h3>

                    {/* Action Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            >
                                <MoreVertical className="h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                onOpen?.(project);
                            }}>
                                <FolderOpen className="h-4 w-4 mr-2" />
                                Open
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                onEdit?.(project);
                            }}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete?.(project);
                                }}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Stats in one line */}
                {stats && (
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{stats.conversationCount} chats</span>
                        <span>{stats.fileCount} files</span>
                        {stats.totalFileSize > 0 && (
                            <span>{formatFileSize(stats.totalFileSize)}</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
