import { Project, ProjectFile, CreateProjectInput, UpdateProjectInput } from './types';

const PROJECTS_KEY = 'enggbot_projects';
const PROJECT_FILES_KEY = 'enggbot_project_files';

// Generate unique ID
function generateId(): string {
    return `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Get all projects
export function getAllProjects(): Project[] {
    if (typeof window === 'undefined') return [];

    try {
        const stored = localStorage.getItem(PROJECTS_KEY);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch (error) {
        console.error('Error loading projects:', error);
        return [];
    }
}

// Get a specific project
export function getProject(id: string): Project | null {
    const projects = getAllProjects();
    return projects.find(p => p.id === id) || null;
}

// Create a new project
export function createProject(input: CreateProjectInput): Project {
    const projects = getAllProjects();

    const newProject: Project = {
        id: generateId(),
        name: input.name,
        description: input.description,
        emoji: input.emoji || '📁',
        customInstructions: input.customInstructions,
        color: input.color,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        conversationIds: [],
        fileIds: [],
    };

    projects.push(newProject);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));

    return newProject;
}

// Update a project
export function updateProject(id: string, input: UpdateProjectInput): Project | null {
    const projects = getAllProjects();
    const index = projects.findIndex(p => p.id === id);

    if (index === -1) return null;

    projects[index] = {
        ...projects[index],
        ...input,
        updated: new Date().toISOString(),
    };

    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    return projects[index];
}

// Delete a project
export function deleteProject(id: string): boolean {
    const projects = getAllProjects();
    const filtered = projects.filter(p => p.id !== id);

    if (filtered.length === projects.length) return false;

    localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered));

    // Also delete associated files
    const files = getAllProjectFiles();
    const filteredFiles = files.filter(f => f.projectId !== id);
    localStorage.setItem(PROJECT_FILES_KEY, JSON.stringify(filteredFiles));

    return true;
}

// Add conversation to project
export function addConversationToProject(projectId: string, conversationId: string): boolean {
    const project = getProject(projectId);
    if (!project) return false;

    if (!project.conversationIds.includes(conversationId)) {
        project.conversationIds.push(conversationId);
        updateProject(projectId, { ...project });
    }

    return true;
}

// Remove conversation from project
export function removeConversationFromProject(projectId: string, conversationId: string): boolean {
    const project = getProject(projectId);
    if (!project) return false;

    project.conversationIds = project.conversationIds.filter(id => id !== conversationId);
    updateProject(projectId, { ...project });

    return true;
}

// ===== File Management =====

// Get all files across all projects
function getAllProjectFiles(): ProjectFile[] {
    if (typeof window === 'undefined') return [];

    try {
        const stored = localStorage.getItem(PROJECT_FILES_KEY);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch (error) {
        console.error('Error loading project files:', error);
        return [];
    }
}

// Get files for a specific project
export function getProjectFiles(projectId: string): ProjectFile[] {
    const allFiles = getAllProjectFiles();
    return allFiles.filter(f => f.projectId === projectId);
}

// Add a file to a project
export function addProjectFile(projectId: string, file: Omit<ProjectFile, 'id' | 'projectId' | 'uploadDate'>): ProjectFile | null {
    const project = getProject(projectId);
    if (!project) return null;

    const allFiles = getAllProjectFiles();

    const newFile: ProjectFile = {
        id: generateFileId(),
        projectId,
        uploadDate: new Date().toISOString(),
        ...file,
    };

    allFiles.push(newFile);
    localStorage.setItem(PROJECT_FILES_KEY, JSON.stringify(allFiles));

    // Update project's file IDs
    project.fileIds.push(newFile.id);
    updateProject(projectId, { ...project });

    return newFile;
}

// Remove a file from a project
export function removeProjectFile(projectId: string, fileId: string): boolean {
    const allFiles = getAllProjectFiles();
    const filtered = allFiles.filter(f => f.id !== fileId);

    if (filtered.length === allFiles.length) return false;

    localStorage.setItem(PROJECT_FILES_KEY, JSON.stringify(filtered));

    // Update project's file IDs
    const project = getProject(projectId);
    if (project) {
        project.fileIds = project.fileIds.filter(id => id !== fileId);
        updateProject(projectId, { ...project });
    }

    return true;
}

// Get a specific file
export function getProjectFile(fileId: string): ProjectFile | null {
    const allFiles = getAllProjectFiles();
    return allFiles.find(f => f.id === fileId) || null;
}

// Search projects by name or description
export function searchProjects(query: string): Project[] {
    const projects = getAllProjects();
    const lowerQuery = query.toLowerCase();

    return projects.filter(p =>
        p.name.toLowerCase().includes(lowerQuery) ||
        (p.description && p.description.toLowerCase().includes(lowerQuery))
    );
}

// Get project statistics
export function getProjectStats(projectId: string): {
    conversationCount: number;
    fileCount: number;
    totalFileSize: number;
} | null {
    const project = getProject(projectId);
    if (!project) return null;

    const files = getProjectFiles(projectId);
    const totalFileSize = files.reduce((sum, file) => sum + file.size, 0);

    return {
        conversationCount: project.conversationIds.length,
        fileCount: files.length,
        totalFileSize,
    };
}
