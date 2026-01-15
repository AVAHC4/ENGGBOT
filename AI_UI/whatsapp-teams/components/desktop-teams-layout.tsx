"use client"

import { useState } from "react"
import { TeamsSidebar } from "@/components/teams-sidebar"
import { ChatInterface } from "@/components/chat-interface"

interface Team {
  id: string
  name: string
  lastMessage: string
  timestamp: string
  avatar?: string
  unreadCount?: number
  isOnline?: boolean
}

const initialTeams: Team[] = [
  {
    id: "1",
    name: "Design Team",
    lastMessage: "Sarah: The new mockups are ready for review",
    timestamp: "2:34 PM",
    unreadCount: 3,
    isOnline: true,
  },
  {
    id: "2",
    name: "Development Team",
    lastMessage: "Mike: Deployed the latest changes to staging",
    timestamp: "1:45 PM",
    unreadCount: 1,
    isOnline: true,
  },
  {
    id: "3",
    name: "Marketing Team",
    lastMessage: "Lisa: Campaign performance looks great this week",
    timestamp: "12:30 PM",
    isOnline: false,
  },
  {
    id: "4",
    name: "Product Team",
    lastMessage: "Alex: User feedback from the beta is very positive",
    timestamp: "11:15 AM",
    isOnline: true,
  },
  {
    id: "5",
    name: "Sales Team",
    lastMessage: "John: Q4 targets are looking achievable",
    timestamp: "Yesterday",
    isOnline: false,
  },
  {
    id: "6",
    name: "Support Team",
    lastMessage: "Emma: Ticket volume is down 20% this month",
    timestamp: "Yesterday",
    unreadCount: 2,
    isOnline: true,
  },
]

export function DesktopTeamsLayout() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>(initialTeams)

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

  return (
    <div className="flex h-screen">
      { }
      <div className="w-80 border-r border-border flex-shrink-0 -ml-2">
        <TeamsSidebar selectedTeamId={selectedTeamId} onTeamSelect={handleTeamSelect} teams={teams} />
      </div>

      { }
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
