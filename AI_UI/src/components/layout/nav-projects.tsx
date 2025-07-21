"use client"

import * as React from "react"
import {
  ChevronRight,
  Folder,
  FolderOpen,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Upload,
  FileText,
  Search,
  Target,
  Calendar,
  CheckCircle2,
  Circle
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/blocks/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useProjects, Project } from "@/context/projects-context"

interface NavProjectsProps {
  className?: string
}

export function NavProjects({ className }: NavProjectsProps) {
  const {
    projects,
    activeProject,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
    setActiveProject,
    ingestDocument,
    ingestText,
  } = useProjects()

  // Local state for UI interactions
  const [isExpanded, setIsExpanded] = React.useState(true)
  const [showCreateForm, setShowCreateForm] = React.useState(false)
  const [editingProject, setEditingProject] = React.useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = React.useState<{ project: Project } | null>(null)
  const [showUploadModal, setShowUploadModal] = React.useState<{ project: Project } | null>(null)
  const [showTextIngestModal, setShowTextIngestModal] = React.useState<{ project: Project } | null>(null)

  // Form states
  const [newProjectName, setNewProjectName] = React.useState("")
  const [newProjectGoal, setNewProjectGoal] = React.useState("")
  const [editProjectName, setEditProjectName] = React.useState("")
  const [editProjectGoal, setEditProjectGoal] = React.useState("")
  const [textContent, setTextContent] = React.useState("")
  const [textFilename, setTextFilename] = React.useState("user-input.txt")

  // File upload ref
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Handle create project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    const project = await createProject(newProjectName.trim(), newProjectGoal.trim() || undefined)
    if (project) {
      setNewProjectName("")
      setNewProjectGoal("")
      setShowCreateForm(false)
      // Automatically set as active project
      setActiveProject(project)
    }
  }

  // Handle edit project
  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject || !editProjectName.trim()) return

    const updated = await updateProject(editingProject, {
      name: editProjectName.trim(),
      goal: editProjectGoal.trim() || undefined
    })
    
    if (updated) {
      setEditingProject(null)
      setEditProjectName("")
      setEditProjectGoal("")
    }
  }

  // Handle delete project
  const handleDeleteProject = async () => {
    if (!showDeleteModal) return

    const success = await deleteProject(showDeleteModal.project.id)
    if (success) {
      setShowDeleteModal(null)
    }
  }

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !showUploadModal) return

    const success = await ingestDocument(showUploadModal.project.id, file)
    if (success) {
      setShowUploadModal(null)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // Handle text ingestion
  const handleTextIngest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!textContent.trim() || !showTextIngestModal) return

    const success = await ingestText(
      showTextIngestModal.project.id,
      textContent.trim(),
      textFilename.trim() || "user-input.txt"
    )
    
    if (success) {
      setTextContent("")
      setTextFilename("user-input.txt")
      setShowTextIngestModal(null)
    }
  }

  // Start editing a project
  const startEditing = (project: Project) => {
    setEditingProject(project.id)
    setEditProjectName(project.name)
    setEditProjectGoal(project.goal || "")
  }

  return (
    <>
      <SidebarMenu className={className}>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <FolderOpen className="h-4 w-4" />
                ) : (
                  <Folder className="h-4 w-4" />
                )}
                <span>Projects</span>
                {activeProject && (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {projects.length}
                </span>
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
              </div>
            </div>
          </SidebarMenuButton>

          {isExpanded && (
            <SidebarMenuSub>
              {/* Active Project Indicator */}
              {activeProject && (
                <SidebarMenuSubItem>
                  <div className="px-4 py-2 bg-accent/50 rounded-md border border-accent">
                    <div className="flex items-center gap-2 text-xs">
                      <Target className="h-3 w-3 text-green-500" />
                      <span className="font-medium">Active:</span>
                      <span className="truncate">{activeProject.name}</span>
                    </div>
                  </div>
                </SidebarMenuSubItem>
              )}

              {/* Create New Project Button */}
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  onClick={() => setShowCreateForm(true)}
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Project</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>

              {/* Projects List */}
              {isLoading ? (
                <SidebarMenuSubItem>
                  <div className="px-4 py-2 text-xs text-muted-foreground">
                    Loading projects...
                  </div>
                </SidebarMenuSubItem>
              ) : error ? (
                <SidebarMenuSubItem>
                  <div className="px-4 py-2 text-xs text-destructive">
                    Error: {error}
                  </div>
                </SidebarMenuSubItem>
              ) : projects.length > 0 ? (
                projects.map((project) => (
                  <SidebarMenuSubItem key={project.id}>
                    <SidebarMenuSubButton
                      onClick={() => setActiveProject(project)}
                      className={`w-full group ${
                        activeProject?.id === project.id
                          ? "bg-accent text-accent-foreground"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {activeProject?.id === project.id ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                          ) : (
                            <Circle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {project.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(project.created_at), {
                                addSuffix: true,
                              })}
                            </div>
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveProject(project)
                              }}
                            >
                              <Target className="h-3 w-3 mr-2" />
                              Set Active
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowUploadModal({ project })
                              }}
                            >
                              <Upload className="h-3 w-3 mr-2" />
                              Upload Document
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowTextIngestModal({ project })
                              }}
                            >
                              <FileText className="h-3 w-3 mr-2" />
                              Add Text Content
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                startEditing(project)
                              }}
                            >
                              <Pencil className="h-3 w-3 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowDeleteModal({ project })
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-3 w-3 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))
              ) : (
                <SidebarMenuSubItem>
                  <div className="px-4 py-2 text-xs text-muted-foreground">
                    No projects yet. Create your first project to get started!
                  </div>
                </SidebarMenuSubItem>
              )}
            </SidebarMenuSub>
          )}
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Create Project Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Create New Project</h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Project Name *
                </label>
                <Input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Enter project name..."
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Project Goal (Optional)
                </label>
                <Textarea
                  value={newProjectGoal}
                  onChange={(e) => setNewProjectGoal(e.target.value)}
                  placeholder="Describe what you want to achieve with this project..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false)
                    setNewProjectName("")
                    setNewProjectGoal("")
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!newProjectName.trim()}>
                  Create Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Edit Project</h2>
            <form onSubmit={handleEditProject} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Project Name *
                </label>
                <Input
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  placeholder="Enter project name..."
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Project Goal (Optional)
                </label>
                <Textarea
                  value={editProjectGoal}
                  onChange={(e) => setEditProjectGoal(e.target.value)}
                  placeholder="Describe what you want to achieve with this project..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingProject(null)
                    setEditProjectName("")
                    setEditProjectGoal("")
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!editProjectName.trim()}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold mb-2">Delete Project</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete "{showDeleteModal.project.name}"? 
              This will permanently delete the project and all associated documents and chat history.
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteProject}
              >
                Delete Project
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">
              Upload Document to "{showUploadModal.project.name}"
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Select Document
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="w-full p-2 border border-input rounded-md"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supported formats: .txt, .md, .pdf, .doc, .docx (max 10MB)
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowUploadModal(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Text Ingest Modal */}
      {showTextIngestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">
              Add Text Content to "{showTextIngestModal.project.name}"
            </h2>
            <form onSubmit={handleTextIngest} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Filename (Optional)
                </label>
                <Input
                  value={textFilename}
                  onChange={(e) => setTextFilename(e.target.value)}
                  placeholder="user-input.txt"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Text Content *
                </label>
                <Textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Paste or type your text content here..."
                  rows={6}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowTextIngestModal(null)
                    setTextContent("")
                    setTextFilename("user-input.txt")
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!textContent.trim()}>
                  Add Content
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
