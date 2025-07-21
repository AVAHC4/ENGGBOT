"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types for the Projects feature
export interface Project {
  id: string;
  user_id: string;
  name: string;
  goal?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectsContextType {
  // State
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProjects: () => Promise<void>;
  createProject: (name: string, goal?: string) => Promise<Project | null>;
  updateProject: (id: string, updates: Partial<Pick<Project, 'name' | 'goal'>>) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
  setActiveProject: (project: Project | null) => void;
  
  // RAG Actions
  ingestDocument: (projectId: string, file: File) => Promise<boolean>;
  ingestText: (projectId: string, content: string, filename?: string) => Promise<boolean>;
  searchProject: (projectId: string, query: string, topK?: number) => Promise<any[]>;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

// API base URL - adjust based on your setup
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to make authenticated API calls
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: 'include', // Include cookies for session-based auth
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  };

  // Fetch all projects for the current user
  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await apiCall('/projects');
      setProjects(data.projects || []);
      
      // If there's an active project ID in localStorage, try to restore it
      const savedActiveProjectId = localStorage.getItem('activeProjectId');
      if (savedActiveProjectId && data.projects) {
        const savedProject = data.projects.find((p: Project) => p.id === savedActiveProjectId);
        if (savedProject) {
          setActiveProjectState(savedProject);
        } else {
          localStorage.removeItem('activeProjectId');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
      console.error('Error fetching projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new project
  const createProject = async (name: string, goal?: string): Promise<Project | null> => {
    try {
      setError(null);
      
      const data = await apiCall('/projects', {
        method: 'POST',
        body: JSON.stringify({ name, goal }),
      });
      
      const newProject = data.project;
      setProjects(prev => [newProject, ...prev]);
      
      return newProject;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      console.error('Error creating project:', err);
      return null;
    }
  };

  // Update an existing project
  const updateProject = async (id: string, updates: Partial<Pick<Project, 'name' | 'goal'>>): Promise<Project | null> => {
    try {
      setError(null);
      
      const data = await apiCall(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      
      const updatedProject = data.project;
      setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
      
      // Update active project if it's the one being updated
      if (activeProject?.id === id) {
        setActiveProjectState(updatedProject);
      }
      
      return updatedProject;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
      console.error('Error updating project:', err);
      return null;
    }
  };

  // Delete a project
  const deleteProject = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      await apiCall(`/projects/${id}`, {
        method: 'DELETE',
      });
      
      setProjects(prev => prev.filter(p => p.id !== id));
      
      // Clear active project if it's the one being deleted
      if (activeProject?.id === id) {
        setActiveProject(null);
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      console.error('Error deleting project:', err);
      return false;
    }
  };

  // Set the active project
  const setActiveProject = (project: Project | null) => {
    setActiveProjectState(project);
    
    // Persist active project ID to localStorage
    if (project) {
      localStorage.setItem('activeProjectId', project.id);
    } else {
      localStorage.removeItem('activeProjectId');
    }
  };

  // RAG Functions

  // Ingest a document file into the project's vector database
  const ingestDocument = async (projectId: string, file: File): Promise<boolean> => {
    try {
      setError(null);
      
      const formData = new FormData();
      formData.append('document', file);
      
      const response = await fetch(`${API_BASE_URL}/rag/${projectId}/ingest`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ingest document');
      console.error('Error ingesting document:', err);
      return false;
    }
  };

  // Ingest text content into the project's vector database
  const ingestText = async (projectId: string, content: string, filename = 'user-input.txt'): Promise<boolean> => {
    try {
      setError(null);
      
      await apiCall(`/rag/${projectId}/ingest-text`, {
        method: 'POST',
        body: JSON.stringify({ content, filename }),
      });
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ingest text');
      console.error('Error ingesting text:', err);
      return false;
    }
  };

  // Search the project's vector database
  const searchProject = async (projectId: string, query: string, topK = 5): Promise<any[]> => {
    try {
      setError(null);
      
      const data = await apiCall(`/rag/${projectId}/search`, {
        method: 'POST',
        body: JSON.stringify({ query, topK }),
      });
      
      return data.results || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search project');
      console.error('Error searching project:', err);
      return [];
    }
  };

  // Load projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const value: ProjectsContextType = {
    projects,
    activeProject,
    isLoading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    setActiveProject,
    ingestDocument,
    ingestText,
    searchProject,
  };

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
}

// Hook to use the projects context
export function useProjects() {
  const context = useContext(ProjectsContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return context;
}
