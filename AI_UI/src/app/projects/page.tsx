"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Grid3x3, List, Plus } from "lucide-react";
import { getAllProjects, deleteProject, searchProjects } from "@/lib/projects/storage";
import { Project } from "@/lib/projects/types";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ProjectCard } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function ProjectsPage() {
    const router = useRouter();
    const [projects, setProjects] = React.useState<Project[]>([]);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('list');
    const [projectToDelete, setProjectToDelete] = React.useState<Project | null>(null);

    // Load projects
    const loadProjects = React.useCallback(() => {
        const allProjects = getAllProjects();
        setProjects(allProjects);
    }, []);

    React.useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    // Filter projects based on search
    const filteredProjects = React.useMemo(() => {
        if (!searchQuery.trim()) return projects;
        return searchProjects(searchQuery);
    }, [projects, searchQuery]);

    const handleProjectCreated = (projectId: string) => {
        loadProjects();
        // Optionally navigate to the project
        // router.push(`/projects/${projectId}`);
    };

    const handleOpenProject = (project: Project) => {
        router.push(`/projects/${project.id}`);
    };

    const handleEditProject = (project: Project) => {
        router.push(`/projects/${project.id}?edit=true`);
    };

    const handleDeleteProject = (project: Project) => {
        setProjectToDelete(project);
    };

    const confirmDelete = () => {
        if (projectToDelete) {
            deleteProject(projectToDelete.id);
            loadProjects();
            setProjectToDelete(null);
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h1 className="text-3xl font-bold">Projects</h1>
                            <p className="text-muted-foreground mt-1">
                                Organize your conversations with custom workspaces
                            </p>
                        </div>
                        <CreateProjectDialog onProjectCreated={handleProjectCreated} />
                    </div>

                    {/* Search and View Controls */}
                    <div className="flex gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search projects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <div className="flex gap-1 border rounded-md p-1">
                            <Button
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('grid')}
                            >
                                <Grid3x3 className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('list')}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Projects Grid/List */}
                {filteredProjects.length === 0 ? (
                    <div className="text-center py-16">
                        {searchQuery ? (
                            <div>
                                <p className="text-muted-foreground mb-4">No projects found matching "{searchQuery}"</p>
                                <Button variant="outline" onClick={() => setSearchQuery("")}>
                                    Clear Search
                                </Button>
                            </div>
                        ) : (
                            <div>
                                <div className="text-6xl mb-4">📁</div>
                                <h2 className="text-2xl font-semibold mb-2">No projects yet</h2>
                                <p className="text-muted-foreground mb-6">
                                    Create your first project to get started
                                </p>
                                <CreateProjectDialog
                                    trigger={
                                        <Button size="lg">
                                            <Plus className="h-5 w-5 mr-2" />
                                            Create Your First Project
                                        </Button>
                                    }
                                    onProjectCreated={handleProjectCreated}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div
                        className={
                            viewMode === 'grid'
                                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                                : 'flex flex-col gap-4'
                        }
                    >
                        {filteredProjects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onOpen={handleOpenProject}
                                onEdit={handleEditProject}
                                onDelete={handleDeleteProject}
                            />
                        ))}
                    </div>
                )}

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete "{projectToDelete?.name}"? This will remove all
                                associated files and cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete Project
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
