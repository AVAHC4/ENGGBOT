
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
    console.log('[SERVER CHECK] ProjectPage rendering for ID:', params.projectId);
    console.log('[SERVER CHECK] Timestamp:', new Date().toISOString());

    return <ProjectPageClient projectId={params.projectId} />;
}
