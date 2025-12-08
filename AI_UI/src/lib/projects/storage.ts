import { Project, ProjectFile, CreateProjectInput, UpdateProjectInput } from './types';
import { getUserEmail } from '@/lib/storage';

// API Endpoints
const API_BASE = '/api/projects';

// Fetch all projects from API (and sync with DB)
export async function getAllProjectsAsync(): Promise<Project[]> {
    if (typeof window === 'undefined') return [];

    const email = getUserEmail();
    if (!email) return [];

    try {
        const response = await fetch(`${API_BASE}?email=${encodeURIComponent(email)}`);
        if (!response.ok) throw new Error('Failed to fetch projects');
        const data = await response.json();
        return data.projects || [];
    } catch (error) {
        console.error('Error loading projects from API:', error);
        return [];
    }
}

// Get all projects - Synchronous fallback (deprecated, or used for hydration if needed)
export function getAllProjects(): Project[] {
    // For now, we return empty or try to return cached?
    // The original signature was synchronous. This is a breaking change for callers expecting synchronous return.
    // However, for React components, they should use `useEffect` to load data.
    // If we change this to async, we need to update all call sites.
    // OPTION: We can keep it synchronous by returning what's in a cache, but trigger a fetch?
    // Given the task, we should probably refactor to async patterns.
    // But to minimize breakage, I will return empty array and log warning.
    console.warn('getAllProjects (sync) called. Use getAllProjectsAsync instead.');
    return [];
}

// Get a specific project (Async)
export async function getProjectAsync(id: string): Promise<Project | null> {
    const email = getUserEmail();
    if (!email) return null;

    try {
        const response = await fetch(`${API_BASE}/${id}?email=${encodeURIComponent(email)}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.project;
    } catch (error) {
        console.error('Error loading project:', error);
        return null;
    }
}

// Create a new project
export async function createProject(input: CreateProjectInput): Promise<Project | null> {
    const email = getUserEmail();
    if (!email) return null;

    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                ...input
            })
        });

        if (!response.ok) throw new Error('Failed to create project');
        const data = await response.json();
        return data.project;
    } catch (error) {
        console.error('Error creating project:', error);
        return null;
    }
}

// Update a project
export async function updateProject(id: string, input: UpdateProjectInput): Promise<Project | null> {
    const email = getUserEmail();
    if (!email) return null;

    try {
        const response = await fetch(`${API_BASE}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                ...input
            })
        });

        if (!response.ok) throw new Error('Failed to update project');
        const data = await response.json();
        return data.project;
    } catch (error) {
        console.error('Error updating project:', error);
        return null;
    }
}

// Delete a project
export async function deleteProject(id: string): Promise<boolean> {
    const email = getUserEmail();
    if (!email) return false;

    try {
        const response = await fetch(`${API_BASE}/${id}?email=${encodeURIComponent(email)}`, {
            method: 'DELETE'
        });

        return response.ok;
    } catch (error) {
        console.error('Error deleting project:', error);
        return false;
    }
}

// Add conversation to project
export async function addConversationToProject(projectId: string, conversationId: string): Promise<boolean> {
    const email = getUserEmail();
    if (!email) return false;

    // To add a conversation to a project, we essentially update the conversation's project_id.
    // We can do this via the conversation API or a specialized endpoint.
    // Earlier we decided to handle it by updating the conversation.
    try {
        const response = await fetch(`/api/conversations/${conversationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                projectId // This updates project_id column
            })
        });
        return response.ok;
    } catch (error) {
        console.error('Error adding conversation to project:', error);
        return false;
    }
}

// Remove conversation from project
export async function removeConversationFromProject(projectId: string, conversationId: string): Promise<boolean> {
    const email = getUserEmail();
    if (!email) return false;

    try {
        // Set project_id to null
        const response = await fetch(`/api/conversations/${conversationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                projectId: null
            })
        });
        return response.ok;
    } catch (error) {
        console.error('Error removing conversation from project:', error);
        return false;
    }
}

// ===== File Management =====

// Get all files for a project
export async function getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    const email = getUserEmail();
    if (!email) return [];

    try {
        const response = await fetch(`${API_BASE}/${projectId}/files?email=${encodeURIComponent(email)}`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.files || [];
    } catch (error) {
        console.error('Error loading project files:', error);
        return [];
    }
}

// Add a file to a project
export async function addProjectFile(projectId: string, file: Omit<ProjectFile, 'id' | 'projectId' | 'uploadDate'>): Promise<ProjectFile | null> {
    const email = getUserEmail();
    if (!email) return null;

    try {
        const response = await fetch(`${API_BASE}/${projectId}/files`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                name: file.name,
                type: file.type,
                size: file.size,
                content: file.content
            })
        });

        if (!response.ok) return null;
        const data = await response.json();
        return data.file;
    } catch (error) {
        console.error('Error adding project file:', error);
        return null;
    }
}

// Remove a file from a project
export async function removeProjectFile(projectId: string, fileId: string): Promise<boolean> {
    const email = getUserEmail();
    if (!email) return false;

    try {
        const response = await fetch(`${API_BASE}/${projectId}/files/${fileId}?email=${encodeURIComponent(email)}`, {
            method: 'DELETE'
        });

        return response.ok;
    } catch (error) {
        console.error('Error deleting project file:', error);
        return false;
    }
}

// Get project statistics
export async function getProjectStats(projectId: string): Promise<{
    conversationCount: number;
    fileCount: number;
    totalFileSize: number;
} | null> {
    const project = await getProjectAsync(projectId);
    if (!project) return null;

    const files = await getProjectFiles(projectId);
    const totalFileSize = files.reduce((sum, file) => sum + (file.size || 0), 0);

    return {
        conversationCount: project.conversationIds.length,
        fileCount: files.length,
        totalFileSize,
    };
}
