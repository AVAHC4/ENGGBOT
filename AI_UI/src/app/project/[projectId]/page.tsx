import React from 'react';
import ProjectPageClient from './client-page';

// Force dynamic rendering to prevent 404s on Vercel
export const dynamic = 'force-dynamic';

interface PageProps {
    params: {
        projectId: string;
    };
}

export default function ProjectPage({ params }: PageProps) {
    return <ProjectPageClient projectId={params.projectId} />;
}
