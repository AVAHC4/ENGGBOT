export interface Project {
    id: string;
    name: string;
    description?: string;
    emoji: string;
    customInstructions?: string;
    created: string;
    updated: string;
    conversationIds: string[];
    fileIds: string[];
    color?: string;
}

export interface ProjectFile {
    id: string;
    projectId: string;
    name: string;
    type: string;
    size: number;
    uploadDate: string;
    content?: string; // For text files, base64 for others
    path?: string;
}

export interface ProjectSettings {
    id: string;
    visibility: 'private' | 'shared';
    shareLink?: string;
    allowFileUploads: boolean;
    maxFileSize: number; // in bytes
}

export interface CreateProjectInput {
    name: string;
    description?: string;
    emoji?: string;
    customInstructions?: string;
    color?: string;
}

export interface UpdateProjectInput {
    name?: string;
    description?: string;
    emoji?: string;
    customInstructions?: string;
    color?: string;
}
