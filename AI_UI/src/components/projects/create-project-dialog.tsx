"use client";

import * as React from "react";
import { Plus, Smile } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProject } from "@/lib/projects/storage";
import { CreateProjectInput } from "@/lib/projects/types";

const DEFAULT_EMOJIS = [
    "📁", "📊", "💼", "🎯", "🚀", "💡", "🔬", "🎨",
    "📱", "💻", "🏗️", "📚", "🎓", "🔧", "⚡", "🌟"
];

const DEFAULT_COLORS = [
    "#3b82f6", // blue
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#f59e0b", // amber
    "#10b981", // green
    "#6366f1", // indigo
    "#ef4444", // red
    "#14b8a6", // teal
];

interface CreateProjectDialogProps {
    trigger?: React.ReactNode;
    onProjectCreated?: (projectId: string) => void;
}

export function CreateProjectDialog({ trigger, onProjectCreated }: CreateProjectDialogProps) {
    const [open, setOpen] = React.useState(false);
    const [name, setName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [emoji, setEmoji] = React.useState("📁");
    const [color, setColor] = React.useState(DEFAULT_COLORS[0]);
    const [customInstructions, setCustomInstructions] = React.useState("");
    const [isCreating, setIsCreating] = React.useState(false);

    const handleCreate = () => {
        if (!name.trim()) return;

        setIsCreating(true);

        // Generate a temporary ID for optimistic update
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const now = new Date().toISOString();
        const projectName = name.trim();

        // Store project name in sessionStorage for project page to use
        sessionStorage.setItem(`project_name_${tempId}`, projectName);

        // Reset form and close dialog immediately
        setName("");
        setDescription("");
        setEmoji("📁");
        setColor(DEFAULT_COLORS[0]);
        setCustomInstructions("");
        setOpen(false);
        setIsCreating(false);

        // Notify parent with temp ID immediately
        onProjectCreated?.(tempId);

        // Sync with Supabase in background
        const input: CreateProjectInput = {
            name: projectName,
            description: description.trim() || undefined,
            emoji,
            color,
            customInstructions: customInstructions.trim() || undefined,
        };

        (async () => {
            try {
                const newProject = await createProject(input);
                if (newProject) {
                    // Store mapping in sessionStorage for project page to use
                    sessionStorage.setItem(`project_id_map_${tempId}`, newProject.id);
                    // Dispatch event for components to update their ID
                    window.dispatchEvent(new CustomEvent('projectIdUpdated', {
                        detail: { tempId, realId: newProject.id }
                    }));
                }
            } catch (error) {
                console.error("Error creating project:", error);
            }
        })();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        New Project
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>
                        Create a workspace with custom instructions and files for your conversations.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Project Name */}
                    <div className="grid gap-2">
                        <Label htmlFor="name">Project Name *</Label>
                        <Input
                            id="name"
                            placeholder="My Awesome Project"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={50}
                        />
                    </div>

                    {/* Description */}
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="What is this project about?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            maxLength={200}
                        />
                    </div>

                    {/* Emoji Picker */}
                    <div className="grid gap-2">
                        <Label>Icon</Label>
                        <div className="flex gap-2 flex-wrap">
                            {DEFAULT_EMOJIS.map((e) => (
                                <button
                                    key={e}
                                    type="button"
                                    onClick={() => setEmoji(e)}
                                    className={`text-2xl p-2 rounded-md hover:bg-accent transition-colors ${emoji === e ? "bg-accent ring-2 ring-primary" : ""
                                        }`}
                                >
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div className="grid gap-2">
                        <Label>Color</Label>
                        <div className="flex gap-2 flex-wrap">
                            {DEFAULT_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`w-8 h-8 rounded-md transition-all ${color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                                        }`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Custom Instructions */}
                    <div className="grid gap-2">
                        <Label htmlFor="instructions">Custom Instructions (Optional)</Label>
                        <Textarea
                            id="instructions"
                            placeholder="Add custom instructions that will be included in every conversation..."
                            value={customInstructions}
                            onChange={(e) => setCustomInstructions(e.target.value)}
                            rows={3}
                            maxLength={1000}
                        />
                        <p className="text-xs text-muted-foreground">
                            These instructions will be automatically added to all conversations in this project.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isCreating}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
                        {isCreating ? "Creating..." : "Create Project"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
