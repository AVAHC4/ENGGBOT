"use client"

import { useEffect, useState, useCallback } from "react"
import { TeamsSidebar } from "@/components/teams/teams-sidebar"
import { ChatInterface } from "@/components/teams/chat-interface"
import { getCurrentUser } from "@/lib/user"
import { listTeams as apiListTeams, createTeam as apiCreateTeam } from "@/lib/teams-api"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Team {
  id: string
  name: string
  lastMessage: string
  timestamp: string
  avatar?: string
  unreadCount?: number
  isOnline?: boolean
}

// Loaded dynamically from backend
// lastMessage/timestamp will be filled when message APIs are wired

export function DesktopTeamsLayout() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const loadTeams = useCallback(() => {
    const user = getCurrentUser()
    apiListTeams(user.email)
      .then((list) => {
        const mapped: Team[] = list.map((t) => ({
          id: t.id,
          name: t.name,
          lastMessage: "",
          timestamp: "",
        }))
        setTeams(mapped)
        if (mapped.length > 0) {
          // Keep current selection if still present; otherwise select first
          setSelectedTeamId((prev) => (prev && mapped.some((t) => t.id === prev) ? prev : mapped[0].id))
        } else {
          setSelectedTeamId(null)
        }
      })
      .catch((e) => {
        console.error("Failed to load teams:", e)
      })
  }, [])

  useEffect(() => {
    loadTeams()
    const onRefresh = () => loadTeams()
    window.addEventListener('teams:refresh', onRefresh)
    return () => window.removeEventListener('teams:refresh', onRefresh)
  }, [loadTeams])

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeamId(teamId)
    setTeams((prevTeams) => prevTeams.map((team) => (team.id === teamId ? { ...team, unreadCount: undefined } : team)))
  }

  const updateTeamName = (teamId: string, newName: string) => {
    setTeams((prevTeams) => prevTeams.map((team) => (team.id === teamId ? { ...team, name: newName } : team)))
  }

  const updateTeamAvatar = (teamId: string, newAvatar: string) => {
    setTeams((prevTeams) => prevTeams.map((team) => (team.id === teamId ? { ...team, avatar: newAvatar } : team)))
  }

  const handleCreateTeam = () => {
    setNewTeamName("")
    setCreateError(null)
    setShowCreateDialog(true)
  }

  const handleCreateDialogClose = (open: boolean) => {
    if (!open) {
      setShowCreateDialog(false)
      setNewTeamName("")
      setCreateError(null)
      setCreatingTeam(false)
    } else {
      setShowCreateDialog(true)
    }
  }

  const handleCreateDialogSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = newTeamName.trim()
    if (!name) {
      setCreateError("Team name is required")
      return
    }
    try {
      setCreatingTeam(true)
      setCreateError(null)
      const user = getCurrentUser()
      const created = await apiCreateTeam(name, user.email, user.name)
      const uiTeam: Team = {
        id: created.id,
        name: created.name,
        lastMessage: "",
        timestamp: "",
      }
      setTeams((prev) => [uiTeam, ...prev])
      setSelectedTeamId(created.id)
      setShowCreateDialog(false)
      setNewTeamName("")
    } catch (e) {
      console.error("Failed to create team:", e)
      setCreateError("Failed to create team. Please try again.")
    } finally {
      setCreatingTeam(false)
    }
  }

  return (
    <div className="flex h-screen bg-transparent">
      {/* Teams Sidebar */}
      <div className="w-80 border-r border-border flex-shrink-0 ml-3">
        <TeamsSidebar
          selectedTeamId={selectedTeamId}
          onTeamSelect={handleTeamSelect}
          onCreateTeam={handleCreateTeam}
          teams={teams}
        />
      </div>

      {/* Chat Interface */}
      <div className="flex-1">
        <ChatInterface
          selectedTeamId={selectedTeamId}
          teams={teams}
          onTeamNameUpdate={updateTeamName}
          onTeamAvatarUpdate={updateTeamAvatar}
        />
      </div>

      <Dialog open={showCreateDialog} onOpenChange={handleCreateDialogClose}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreateDialogSubmit} className="space-y-6">
            <DialogHeader>
              <DialogTitle>Create a new team</DialogTitle>
              <DialogDescription>
                Give your team a name. You can customize details and invite members after creating it.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <Label htmlFor="team-name">Team name</Label>
              <Input
                id="team-name"
                name="team-name"
                autoFocus
                value={newTeamName}
                onChange={(e) => {
                  setNewTeamName(e.target.value)
                  if (createError) setCreateError(null)
                }}
                placeholder="Enter team name"
              />
              {createError && <p className="text-sm text-destructive">{createError}</p>}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={creatingTeam}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={creatingTeam || !newTeamName.trim()}>
                {creatingTeam ? "Creating..." : "Create Team"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
