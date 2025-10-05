"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Crown, Shield, User, UserMinus, Settings, Archive, Edit3, Save, X, Camera } from "lucide-react"
import { listTeamMembers, type TeamMember as ApiTeamMember } from "@/lib/teams-api"
import { supabaseClient } from "@/lib/supabase-client"
import { ImageCropDialog } from "@/components/teams/image-crop-dialog"

interface TeamMemberUI {
  id: string
  name: string
  email: string
  role: "admin" | "moderator" | "member"
  avatar?: string
  isOnline: boolean
  lastSeen?: string
}

interface TeamManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  teamName: string
  teamAvatar?: string
  onTeamNameUpdate?: (teamId: string, newName: string) => void
  onTeamAvatarUpdate?: (teamId: string, newAvatar: string) => void // Added avatar update callback
}

export function TeamManagementDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  teamAvatar,
  onTeamNameUpdate,
  onTeamAvatarUpdate, // Added avatar update prop
}: TeamManagementDialogProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(teamName)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showCropDialog, setShowCropDialog] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState("")
  const [description, setDescription] = useState(
    "A collaborative space for our design team to share ideas, feedback, and updates.",
  )
  const [notifications, setNotifications] = useState(true)
  const [allowMemberInvites, setAllowMemberInvites] = useState(false)

  const [members, setMembers] = useState<TeamMemberUI[]>([])

  const mapMembers = (rows: ApiTeamMember[]): TeamMemberUI[] => {
    return rows.map((m) => {
      const email = m.member_email
      const name = email
      return {
        id: email,
        name,
        email,
        role: (m.role as any) || "member",
        isOnline: false,
      }
    })
  }

  useEffect(() => {
    if (!open || !teamId) return

    let cancelled = false
    let channel: ReturnType<NonNullable<typeof supabaseClient>["channel"]> | null = null
    let poll: ReturnType<typeof setInterval> | null = null

    const load = async () => {
      try {
        const rows = await listTeamMembers(teamId)
        if (cancelled) return
        setMembers(mapMembers(rows))
      } catch (e) {
        // best effort
        console.error("Failed to load team members", e)
      }
    }

    load()

    if (supabaseClient) {
      try {
        channel = supabaseClient
          .channel(`team-members-${teamId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members', filter: `team_id=eq.${teamId}` }, () => {
            load()
          })
          .subscribe()
      } catch {
        // fall back to poll
      }
    }

    // Light polling fallback while dialog open (helps if realtime blocked)
    poll = setInterval(load, 2000)

    return () => {
      cancelled = true
      if (channel && supabaseClient) {
        try { supabaseClient.removeChannel(channel) } catch {}
        channel = null
      }
      if (poll) {
        clearInterval(poll)
        poll = null
      }
    }
  }, [open, teamId])

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4 text-yellow-500" />
      case "moderator":
        return <Shield className="h-4 w-4 text-blue-500" />
      default:
        return <User className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getRoleBadge = (role: string) => {
    const variants = {
      admin: "bg-yellow-100 text-yellow-800 border-yellow-200",
      moderator: "bg-blue-100 text-blue-800 border-blue-200",
      member: "bg-gray-100 text-gray-800 border-gray-200",
    }
    return variants[role as keyof typeof variants] || variants.member
  }

  useEffect(() => {
    setEditedName(teamName)
  }, [teamName])

  const handleSave = () => {
    console.log("[v0] Saving team name:", editedName)
    setIsEditing(false)
    if (onTeamNameUpdate && editedName.trim() !== teamName) {
      onTeamNameUpdate(teamId, editedName.trim())
    }
  }

  const handleCancel = () => {
    console.log("[v0] Canceling team name edit")
    setIsEditing(false)
    setEditedName(teamName)
  }

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setSelectedImageUrl(result)
        setShowCropDialog(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCropComplete = (croppedImageUrl: string) => {
    if (onTeamAvatarUpdate) {
      onTeamAvatarUpdate(teamId, croppedImageUrl)
    }
    setShowCropDialog(false)
    setSelectedImageUrl("")
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={teamAvatar || "/placeholder.svg"}
                    alt={teamName}
                    className="object-cover w-full h-full"
                  />
                  <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                    {teamName
                      .split(" ")
                      .map((word) => word[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="text-lg font-semibold"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSave()
                        } else if (e.key === "Escape") {
                          handleCancel()
                        }
                      }}
                      autoFocus
                    />
                    <Button size="sm" onClick={handleSave}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancel}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">{editedName}</span>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="members" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="space-y-4">
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={member.avatar || "/placeholder.svg"}
                            alt={member.name}
                            className="object-cover w-full h-full"
                          />
                          <AvatarFallback className="bg-muted text-muted-foreground">
                            {member.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {member.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.name}</p>
                          {getRoleIcon(member.role)}
                        </div>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                        {!member.isOnline && member.lastSeen && (
                          <p className="text-xs text-muted-foreground">Last seen {member.lastSeen}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${getRoleBadge(member.role)}`}>{member.role}</Badge>
                      {member.role !== "admin" && (
                        <Button variant="ghost" size="sm">
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="description">Team Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this team is about..."
                    className="mt-1"
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Notifications</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Team notifications</p>
                      <p className="text-sm text-muted-foreground">Receive notifications for this team</p>
                    </div>
                    <Switch checked={notifications} onCheckedChange={setNotifications} />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Permissions</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Allow member invites</p>
                      <p className="text-sm text-muted-foreground">Let members invite others to this team</p>
                    </div>
                    <Switch checked={allowMemberInvites} onCheckedChange={setAllowMemberInvites} />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start bg-transparent" size="lg">
                  <Settings className="h-4 w-4 mr-2" />
                  Advanced Settings
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent" size="lg">
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Team
                </Button>
                <Button variant="destructive" className="w-full justify-start" size="lg">
                  <UserMinus className="h-4 w-4 mr-2" />
                  Leave Team
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <ImageCropDialog
        isOpen={showCropDialog}
        onClose={() => {
          setShowCropDialog(false)
          setSelectedImageUrl("")
        }}
        imageUrl={selectedImageUrl}
        onCropComplete={handleCropComplete}
      />
    </>
  )
}

const sampleMembers: Record<string, TeamMemberUI[]> = {
  "1": [
    {
      id: "1",
      name: "Sarah Johnson",
      email: "sarah@company.com",
      role: "admin",
      isOnline: true,
      avatar: "/placeholder.svg",
    },
    {
      id: "2",
      name: "Mike Chen",
      email: "mike@company.com",
      role: "moderator",
      isOnline: true,
      avatar: "/placeholder.svg",
    },
    {
      id: "3",
      name: "Alex Rodriguez",
      email: "alex@company.com",
      role: "member",
      isOnline: false,
      lastSeen: "2 hours ago",
      avatar: "/placeholder.svg",
    },
    {
      id: "4",
      name: "Emma Wilson",
      email: "emma@company.com",
      role: "member",
      isOnline: true,
      avatar: "/placeholder.svg",
    },
    {
      id: "5",
      name: "David Kim",
      email: "david@company.com",
      role: "member",
      isOnline: false,
      lastSeen: "1 day ago",
      avatar: "/placeholder.svg",
    },
  ],
  "2": [
    {
      id: "1",
      name: "Mike Chen",
      email: "mike@company.com",
      role: "admin",
      isOnline: true,
      avatar: "/placeholder.svg",
    },
    {
      id: "2",
      name: "Alex Rodriguez",
      email: "alex@company.com",
      role: "moderator",
      isOnline: false,
      lastSeen: "30 minutes ago",
      avatar: "/placeholder.svg",
    },
    {
      id: "3",
      name: "John Smith",
      email: "john@company.com",
      role: "member",
      isOnline: true,
      avatar: "/placeholder.svg",
    },
  ],
}
