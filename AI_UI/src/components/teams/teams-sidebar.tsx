"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, MoreVertical, Mail } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AddPeopleDialog } from "@/components/teams/add-people-dialog"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { getCurrentUser } from "@/lib/user"
import { acceptInvite, declineInvite, listInvites, type Invite } from "@/lib/teams-api"

type PendingDeleteState = {
  teamId: string
  teamName: string
} | null

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
  onCreateTeam?: (name: string) => Promise<void>
  onDeleteTeam?: (teamId: string) => Promise<void>
  teams: Team[]
  isLoading?: boolean
}

export function TeamsSidebar({ selectedTeamId, onTeamSelect, onCreateTeam, onDeleteTeam, teams, isLoading }: TeamsSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddPeople, setShowAddPeople] = useState(false)
  const [showInvites, setShowInvites] = useState(false)
  const [invites, setInvites] = useState<Invite[]>([])
  const [loadingInvites, setLoadingInvites] = useState(false)
  const [showNewTeamDialog, setShowNewTeamDialog] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [createTeamError, setCreateTeamError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const filteredTeams = teams.filter((team) => team.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const resetNewTeamDialog = () => {
    setCreateTeamError(null)
    setNewTeamName("")
  }

  const handleNewTeamDialogOpenChange = (open: boolean) => {
    setShowNewTeamDialog(open)
    if (!open) {
      resetNewTeamDialog()
    }
  }

  const handleCreateTeamSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!onCreateTeam) return
    await submitNewTeam()
  }

  const submitNewTeam = async () => {
    if (!onCreateTeam) return
    const trimmed = newTeamName.trim()
    if (!trimmed) {
      setCreateTeamError("Team name is required")
      return
    }
    setCreateTeamError(null)
    setCreatingTeam(true)
    try {
      await onCreateTeam(trimmed)
      setShowNewTeamDialog(false)
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : "Failed to create team"
      setCreateTeamError(message)
    } finally {
      setCreatingTeam(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!pendingDelete || !onDeleteTeam) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await onDeleteTeam(pendingDelete.teamId)
      setPendingDelete(null)
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : "Failed to delete team"
      setDeleteError(message)
    } finally {
      setIsDeleting(false)
    }
  }

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
       
      window.dispatchEvent(new CustomEvent('teams:refresh'))
       
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
      { }
      <div className="flex items-center justify-between pl-4 pr-0 py-3 border-b border-border">
        <h1 className="text-xl font-semibold text-foreground">Teams</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="View invitations" onClick={() => { setShowInvites(true); refreshInvites(); }}>
            <Mail className="h-4 w-4" />
          </Button>
          <Dialog open={showNewTeamDialog} onOpenChange={handleNewTeamDialogOpenChange}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => {
                    setShowNewTeamDialog(true)
                  }}
                >
                  New Team
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowAddPeople(true)}>Add People</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Archive</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleCreateTeamSubmit}>
                <DialogHeader>
                  <DialogTitle>Create a new team</DialogTitle>
                  <DialogDescription>Give your team a name. You can invite people after it&apos;s created.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-3">
                    <Label htmlFor="new-team-name">Team name</Label>
                    <Input
                      id="new-team-name"
                      name="team-name"
                      placeholder="Acme Design"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      autoFocus
                      disabled={creatingTeam}
                    />
                  </div>
                  {createTeamError && (
                    <p className="text-sm text-destructive" role="alert">
                      {createTeamError}
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" type="button" disabled={creatingTeam}>
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={creatingTeam}>
                    {creatingTeam ? "Creating…" : "Create team"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      { }
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
           
          <div className="space-y-2 px-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-lg animate-pulse">
                <div className="w-10 h-10 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-24" />
                  <div className="h-3 bg-white/10 rounded w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No teams found
          </div>
        ) : (
          filteredTeams.map((team) => (
            <div
              key={team.id}
              className={`mx-2 mb-1 rounded-lg transition-all duration-200 ${selectedTeamId === team.id ? 'bg-primary/10 border-l-[3px] border-l-primary' : 'border-l-[3px] border-l-transparent hover:bg-muted/50'}`}
            >
              <div className="flex items-center gap-2 px-3 py-3">
                <button
                  className="flex flex-1 items-center gap-3 text-left"
                  onClick={() => onTeamSelect(team.id)}
                >
                  { }
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={team.avatar || "/placeholder.svg"} alt={team.name} />
                      <AvatarFallback className="font-medium text-sm bg-muted text-muted-foreground">
                        {team.name
                          .split(" ")
                          .map((word) => word[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    {team.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 border-2 border-background rounded-full" />
                    )}
                  </div>

                  { }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className={`font-semibold text-sm truncate ${selectedTeamId === team.id ? 'text-foreground' : 'text-foreground/90'}`}>
                        {team.name}
                      </h3>
                      <span className="text-xs flex-shrink-0 ml-2 text-muted-foreground">
                        {team.timestamp}
                      </span>
                    </div>
                    <p className="text-xs truncate text-muted-foreground">
                      {team.lastMessage || 'No messages yet'}
                    </p>
                  </div>

                  { }
                  {team.unreadCount && team.unreadCount > 0 && (
                    <Badge
                      variant="default"
                      className="h-5 min-w-5 text-xs px-1.5 rounded-full flex-shrink-0"
                      style={{ background: '#8b5cf6', color: '#fff' }}
                    >
                      {team.unreadCount}
                    </Badge>
                  )}
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="start">
                    <DropdownMenuLabel>{team.name}</DropdownMenuLabel>
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault()
                          onTeamSelect(team.id)
                        }}
                      >
                        Open
                        <DropdownMenuShortcut>⏎</DropdownMenuShortcut>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault()
                          onTeamSelect(team.id)
                          setShowAddPeople(true)
                        }}
                      >
                        Add people
                        <DropdownMenuShortcut>⌘I</DropdownMenuShortcut>
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Share team</DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onSelect={(event) => event.preventDefault()}>Copy link</DropdownMenuItem>
                            <DropdownMenuItem onSelect={(event) => event.preventDefault()}>Send email</DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={(event) => event.preventDefault()}>Settings</DropdownMenuItem>
                    <DropdownMenuItem onSelect={(event) => event.preventDefault()}>Archive</DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={(event) => {
                        event.preventDefault()
                        setDeleteError(null)
                        setPendingDelete({ teamId: team.id, teamName: team.name })
                      }}
                    >
                      Delete team
                      <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>

      { }
      <AddPeopleDialog
        open={showAddPeople}
        onOpenChange={setShowAddPeople}
        teamId={selectedTeamId || "1"}
        teamName={selectedTeamId ? teams.find((t) => t.id === selectedTeamId)?.name || "Team" : "Team"}
      />

      { }
      <Dialog open={showInvites} onOpenChange={setShowInvites}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Pending Invitations</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {loadingInvites && (
              <div className="space-y-3 animate-pulse">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-white/10 rounded w-24" />
                      <div className="h-3 bg-white/10 rounded w-32" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 bg-white/10 rounded w-16" />
                      <div className="h-8 bg-white/10 rounded w-16" />
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null)
            setDeleteError(null)
            setIsDeleting(false)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete team</DialogTitle>
            <DialogDescription>
              This will permanently remove <span className="font-semibold">{pendingDelete?.teamName}</span> and all of its
              data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive" role="alert">
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isDeleting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting || !onDeleteTeam}>
              {isDeleting ? "Deleting…" : "Delete team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
