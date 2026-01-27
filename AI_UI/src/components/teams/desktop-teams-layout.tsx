"use client"

import { useEffect, useState, useCallback } from "react"
import { TeamsSidebar } from "@/components/teams/teams-sidebar"
import { ChatInterface } from "@/components/teams/chat-interface"
import { getCurrentUser } from "@/lib/user"
import { listTeams as apiListTeams, createTeam as apiCreateTeam, deleteTeam as apiDeleteTeam, leaveTeam as apiLeaveTeam, archiveTeam as apiArchiveTeam } from "@/lib/teams-api"

interface Team {
  id: string
  name: string
  lastMessage: string
  timestamp: string
  avatar?: string
  unreadCount?: number
  isOnline?: boolean
}




export function DesktopTeamsLayout() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadTeams = useCallback(() => {
    setIsLoading(true)
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

          setSelectedTeamId((prev) => (prev && mapped.some((t) => t.id === prev) ? prev : mapped[0].id))
        } else {
          setSelectedTeamId(null)
        }
      })
      .catch((e) => {
        console.error("Failed to load teams:", e)
      })
      .finally(() => {
        setIsLoading(false)
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

  const handleCreateTeam = async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error("Team name is required")
    try {
      const user = getCurrentUser()
      const created = await apiCreateTeam(trimmed, user.email, user.name)
      const uiTeam: Team = {
        id: created.id,
        name: created.name,
        lastMessage: "",
        timestamp: "",
      }
      setTeams((prev) => [uiTeam, ...prev])
      setSelectedTeamId(created.id)
    } catch (e) {
      console.error("Failed to create team:", e)
      throw e
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    try {
      await apiDeleteTeam(teamId)
      setTeams((prev) => {
        const updated = prev.filter((team) => team.id !== teamId)
        setSelectedTeamId((current) => {
          if (current === teamId) {
            return updated.length > 0 ? updated[0].id : null
          }
          return current
        })
        return updated
      })
    } catch (e) {
      console.error("Failed to delete team:", e)
      throw e
    }
  }

  const handleLeaveTeam = async (teamId: string) => {
    try {
      const user = getCurrentUser()
      await apiLeaveTeam(teamId, user.email)

      setTeams((prev) => {
        const updated = prev.filter((team) => team.id !== teamId)
        setSelectedTeamId((current) => {
          if (current === teamId) {
            return updated.length > 0 ? updated[0].id : null
          }
          return current
        })
        return updated
      })
    } catch (e) {
      console.error("Failed to leave team:", e)
      alert("Failed to leave team. Please try again.")
    }
  }

  const handleArchiveTeam = async (teamId: string) => {
    try {
      await apiArchiveTeam(teamId)
      // Remove from local list since archived teams are filtered out
      setTeams((prev) => {
        const updated = prev.filter((team) => team.id !== teamId)
        setSelectedTeamId((current) => {
          if (current === teamId) {
            return updated.length > 0 ? updated[0].id : null
          }
          return current
        })
        return updated
      })
    } catch (e) {
      console.error("Failed to archive team:", e)
      alert("Failed to archive team. Please try again.")
    }
  }

  return (
    <div className="flex h-screen bg-transparent">
      { }
      <div className="w-80 flex-shrink-0 ml-3">
        <TeamsSidebar
          selectedTeamId={selectedTeamId}
          onTeamSelect={handleTeamSelect}
          onCreateTeam={handleCreateTeam}
          onDeleteTeam={handleDeleteTeam}
          teams={teams}
          isLoading={isLoading}
        />
      </div>

      { }
      <div
        className="flex-shrink-0 self-stretch pointer-events-none"
        style={{
          width: '40px',
          marginLeft: '-20px',
          marginRight: '-20px',
          background: 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.015), transparent)'
        }}
      />

      { }
      <div className="flex-1">
        <ChatInterface
          selectedTeamId={selectedTeamId}
          teams={teams}
          onTeamNameUpdate={updateTeamName}
          onTeamAvatarUpdate={updateTeamAvatar}
          onLeaveTeam={handleLeaveTeam}
          onArchiveTeam={handleArchiveTeam}
        />
      </div>
    </div>
  )
}
