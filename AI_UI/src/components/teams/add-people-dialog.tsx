"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Search, UserPlus, Mail, Check } from "lucide-react"

interface Person {
  id: string
  name: string
  email: string
  avatar?: string
  department?: string
  isInTeam?: boolean
}

interface AddPeopleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  teamName: string
}

const availablePeople: Person[] = [
  {
    id: "1",
    name: "Jennifer Lopez",
    email: "jennifer@company.com",
    department: "Marketing",
    avatar: "/placeholder.svg",
  },
  { id: "2", name: "Robert Johnson", email: "robert@company.com", department: "Sales", avatar: "/placeholder.svg" },
  { id: "3", name: "Lisa Wang", email: "lisa@company.com", department: "Engineering", avatar: "/placeholder.svg" },
  { id: "4", name: "Carlos Martinez", email: "carlos@company.com", department: "Product", avatar: "/placeholder.svg" },
  { id: "5", name: "Amanda Taylor", email: "amanda@company.com", department: "HR", avatar: "/placeholder.svg" },
  { id: "6", name: "Kevin Brown", email: "kevin@company.com", department: "Finance", avatar: "/placeholder.svg" },
]

export function AddPeopleDialog({ open, onOpenChange, teamId, teamName }: AddPeopleDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set())
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [inviteMessage, setInviteMessage] = useState("")

  const filteredPeople = availablePeople.filter(
    (person) =>
      person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.department?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const togglePersonSelection = (personId: string) => {
    const newSelected = new Set(selectedPeople)
    if (newSelected.has(personId)) {
      newSelected.delete(personId)
    } else {
      newSelected.add(personId)
    }
    setSelectedPeople(newSelected)
  }

  const handleAddSelected = () => {
    // Here you would typically send the selected people to your backend
    console.log("[v0] Adding people to team:", Array.from(selectedPeople))
    setSelectedPeople(new Set())
    onOpenChange(false)
  }

  const handleSendInvite = () => {
    if (!inviteEmail.trim()) return
    // Call backend to add member to team
    fetch(`/api/teams/${teamId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text())
        setInviteEmail("")
        setInviteMessage("")
        onOpenChange(false)
      })
      .catch((e) => {
        console.error('Failed to add member', e)
        alert('Failed to send invite')
      })
  }

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add People to {teamName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse">Browse People</TabsTrigger>
            <TabsTrigger value="invite">Send Invite</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search people by name, email, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {selectedPeople.size > 0 && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">{selectedPeople.size} people selected</span>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddSelected}>
                      Add to Team
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedPeople(new Set())}>
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredPeople.map((person) => (
                  <div
                    key={person.id}
                    onClick={() => togglePersonSelection(person.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPeople.has(person.id)
                        ? "border-foreground bg-muted/50"
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={person.avatar || "/placeholder.svg"} alt={person.name} />
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          {person.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{person.name}</p>
                        <p className="text-sm text-muted-foreground">{person.email}</p>
                        {person.department && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {person.department}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      {selectedPeople.has(person.id) ? (
                        <div className="h-5 w-5 bg-foreground text-background rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3" />
                        </div>
                      ) : (
                        <div className="h-5 w-5 border-2 border-muted-foreground rounded-full" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="invite" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="Enter email address..."
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="invite-message">Personal Message (Optional)</Label>
                <Textarea
                  id="invite-message"
                  placeholder="Add a personal message to the invitation..."
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSendInvite}
                  disabled={!inviteEmail.trim() || !isValidEmail(inviteEmail)}
                  className="flex-1"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
