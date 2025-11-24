"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProject } from "@/lib/projects/storage";
import { Project } from "@/lib/projects/types";
import { ChatInterface } from "@/components/chat-interface";
import { ChatProvider } from "@/context/chat-context";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings } from "lucide-react";

export default function ProjectPage() {
    const params = useParams();
    const router = useRouter();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params && params.id) {
            const projectId = Array.isArray(params.id) ? params.id[0] : params.id;
            const foundProject = getProject(projectId);
            setProject(foundProject);
            setLoading(false);
        }
    }, [params]);

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

    const CustomHeader = (
        <div className="flex items-center justify-between w-full px-4 py-2">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => router.push("/projects")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{project.emoji}</span>
                    <h1 className="text-lg font-semibold">{project.name}</h1>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {/* Placeholder for project settings if needed later */}
                {/* <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button> */}
            </div>
        </div>
    );

    return (
        <ChatProvider projectId={project.id}>
            <div className="relative h-screen w-full overflow-hidden">
                <ChatInterface
                    customHeader={CustomHeader}
                />
            </div>
        </ChatProvider>
    );
}
