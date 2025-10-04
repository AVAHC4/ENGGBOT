"use client"

import { useEffect, useState } from "react"
import { TeamsSidebar } from "@/components/teams/teams-sidebar"
import { ChatInterface } from "@/components/teams/chat-interface"
import { getCurrentUser } from "@/lib/user"
import { listTeams as apiListTeams, createTeam as apiCreateTeam } from "@/lib/teams-api"

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

  useEffect(() => {
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
        if (mapped.length > 0) setSelectedTeamId(mapped[0].id)
      })
      .catch((e) => {
        console.error("Failed to load teams:", e)
      })
  }, [])

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

  const handleCreateTeam = async () => {
    const name = prompt("Team name")?.trim()
    if (!name) return
    try {
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
    } catch (e) {
      console.error("Failed to create team:", e)
      alert("Failed to create team")
    }
  }

  return (
    <div className="flex h-screen bg-transparent">
      {/* Teams Sidebar */}
      <div className="w-80 border-r border-border flex-shrink-0 -ml-1">
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
    </div>
  )
}
