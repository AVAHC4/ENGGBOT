"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, MoreVertical } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AddPeopleDialog } from "@/components/add-people-dialog"

interface Team {
  id: string
  name: string
  lastMessage: string
  timestamp: string
  avatar?: string
  unreadCount?: number
  isOnline?: boolean
}

interface TeamsSidebarProps {
  selectedTeamId: string | null
  onTeamSelect: (teamId: string) => void
  teams: Team[]
}

export function TeamsSidebar({ selectedTeamId, onTeamSelect, teams }: TeamsSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddPeople, setShowAddPeople] = useState(false)

  const filteredTeams = teams.filter((team) => team.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-xl font-semibold text-foreground">Teams</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>New Team</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowAddPeople(true)}>Add People</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Teams List */}
      <div className="flex-1 overflow-y-auto">
        {filteredTeams.map((team) => (
          <div
            key={team.id}
            onClick={() => onTeamSelect(team.id)}
            className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors ${
              selectedTeamId === team.id ? "bg-muted" : ""
            }`}
          >
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={team.avatar || "/placeholder.svg"} alt={team.name} />
                <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                  {team.name
                    .split(" ")
                    .map((word) => word[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              {team.isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium text-foreground truncate">{team.name}</h3>
                <span className="text-xs text-muted-foreground flex-shrink-0">{team.timestamp}</span>
              </div>
              <p className="text-sm text-muted-foreground truncate">{team.lastMessage}</p>
            </div>

            {/* Unread Badge */}
            {team.unreadCount && team.unreadCount > 0 && (
              <Badge
                variant="default"
                className="bg-foreground text-background hover:bg-foreground/90 h-5 min-w-5 text-xs px-1.5 rounded-full"
              >
                {team.unreadCount}
              </Badge>
            )}
          </div>
        ))}
      </div>

      {/* Add People Dialog */}
      <AddPeopleDialog
        open={showAddPeople}
        onOpenChange={setShowAddPeople}
        teamId={selectedTeamId || "1"}
        teamName={selectedTeamId ? teams.find((t) => t.id === selectedTeamId)?.name || "Team" : "Team"}
      />
    </div>
  )
}
