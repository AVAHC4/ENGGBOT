"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, MoreVertical, Mail } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AddPeopleDialog } from "@/components/teams/add-people-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getCurrentUser } from "@/lib/user"
import { acceptInvite, declineInvite, listInvites, type Invite } from "@/lib/teams-api"

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
  onCreateTeam?: () => void
  teams: Team[]
}

export function TeamsSidebar({ selectedTeamId, onTeamSelect, onCreateTeam, teams }: TeamsSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddPeople, setShowAddPeople] = useState(false)
  const [showInvites, setShowInvites] = useState(false)
  const [invites, setInvites] = useState<Invite[]>([])
  const [loadingInvites, setLoadingInvites] = useState(false)

  const filteredTeams = teams.filter((team) => team.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const refreshInvites = async () => {
    try {
      setLoadingInvites(true)
      const user = getCurrentUser()
      const list = await listInvites(user.email)
      setInvites(list)
    } catch (e) {
      console.error("Failed to load invites:", e)
    } finally {
      setLoadingInvites(false)
    }
  }

  useEffect(() => {
    // Load invites on mount and when dialog opens
    refreshInvites()
    const onSent = () => refreshInvites()
    window.addEventListener('teams:invites:sent', onSent as any)
    return () => window.removeEventListener('teams:invites:sent', onSent as any)
  }, [])

  const handleAccept = async (inviteId: string) => {
    try {
      const user = getCurrentUser()
      const res = await acceptInvite(inviteId, user.email)
      await refreshInvites()
      // Ask parent to refresh teams list via global event
      window.dispatchEvent(new CustomEvent('teams:refresh'))
      // Select the accepted team
      if (res?.team_id) onTeamSelect(res.team_id)
      setShowInvites(false)
    } catch (e) {
      console.error('Failed to accept invite', e)
      alert('Failed to accept invite')
    }
  }

  const handleDecline = async (inviteId: string) => {
    try {
      await declineInvite(inviteId)
      await refreshInvites()
    } catch (e) {
      console.error('Failed to decline invite', e)
      alert('Failed to decline invite')
    }
  }

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header */}
      <div className="flex items-center justify-between px-0 py-3 border-b border-border">
        <h1 className="text-xl font-semibold text-foreground">Teams</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="View invitations" onClick={() => { setShowInvites(true); refreshInvites(); }}>
            <Mail className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onCreateTeam && onCreateTeam()}>New Team</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowAddPeople(true)}>Add People</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search */}
      <div className="px-0 py-3 border-b border-border">
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
            className={`flex items-center gap-3 pl-0 pr-3 py-3 hover:bg-muted/50 cursor-pointer transition-colors ${
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

      {/* Invites Dialog */}
      <Dialog open={showInvites} onOpenChange={setShowInvites}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Pending Invitations</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {loadingInvites && <div className="text-sm text-muted-foreground">Loading invites…</div>}
            {!loadingInvites && invites.length === 0 && (
              <div className="text-sm text-muted-foreground">No pending invitations</div>
            )}
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="min-w-0">
                  <div className="font-medium truncate">{inv.team_name || 'Team'}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {inv.invited_by_email ? `Invited by ${inv.invited_by_email}` : 'Team invitation'}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" onClick={() => handleAccept(inv.id)}>Accept</Button>
                  <Button size="sm" variant="outline" onClick={() => handleDecline(inv.id)}>Decline</Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
