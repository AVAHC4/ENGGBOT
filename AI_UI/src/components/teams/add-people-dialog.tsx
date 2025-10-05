"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { UserPlus, Mail } from "lucide-react"
import { getCurrentUser } from "@/lib/user"

interface AddPeopleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  teamName: string
}

export function AddPeopleDialog({ open, onOpenChange, teamId, teamName }: AddPeopleDialogProps) {
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [inviteMessage, setInviteMessage] = useState("")

  const handleSendInvite = () => {
    if (!inviteEmail.trim()) return
    const inviter = getCurrentUser()
    fetch(`/api/teams/${teamId}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inviteeEmail: inviteEmail,
        role: inviteRole,
        message: inviteMessage,
        invitedByEmail: inviter.email,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text())
        setInviteEmail("")
        setInviteMessage("")
        onOpenChange(false)
        // Optionally signal UI
        window.dispatchEvent(new CustomEvent('teams:invites:sent'))
      })
      .catch((e) => {
        console.error('Failed to send invite', e)
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
      </DialogContent>
    </Dialog>
  )
}
