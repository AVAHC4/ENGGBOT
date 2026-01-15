import React from 'react';
import ProjectConversationPageClient from './client-page';

 
export const dynamic = 'force-dynamic';

interface PageProps {
    params: {
        projectId: string;
        conversationId: string;
    };
}

export default function ProjectConversationPage({ params }: PageProps) {
    return (
        <ProjectConversationPageClient
            projectId={params.projectId}
            conversationId={params.conversationId}
        />
    );
}
