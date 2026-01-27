export type Team = {
  id: string
  name: string
  created_at?: string
  created_by_email?: string
  is_archived?: boolean
}

export async function archiveTeam(teamId: string): Promise<void> {
  const res = await fetch(`/api/teams/${teamId}/archive`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function unarchiveTeam(teamId: string): Promise<void> {
  const res = await fetch(`/api/teams/${teamId}/unarchive`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function listArchivedTeams(email: string): Promise<Team[]> {
  const url = `/api/teams/archived?email=${encodeURIComponent(email)}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to load archived teams: ${res.status}`)
  const json = await res.json()
  return json.teams || []
}

export type Message = {
  id: string
  team_id: string
  sender_email: string
  sender_name?: string | null
  content: string
  created_at: string
}

export type Invite = {
  id: string
  team_id: string
  team_name?: string
  invitee_email: string
  role: string
  message?: string | null
  invited_by_email?: string | null
  status: 'pending' | 'accepted' | 'declined' | 'revoked'
  created_at: string
}

export type TeamMember = {
  member_email: string
  role: string
  joined_at: string
}

export async function listTeams(email: string): Promise<Team[]> {
  const url = `/api/teams?email=${encodeURIComponent(email)}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to load teams: ${res.status}`)
  const json = await res.json()
  return json.teams || []
}

export async function createTeam(name: string, creatorEmail: string, creatorName?: string) {
  const res = await fetch('/api/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, creatorEmail, creatorName }),
  })
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  return json.team as Team
}

export async function fetchMessages(teamId: string, limit = 200, since?: string) {
  const qs = new URLSearchParams({ limit: String(limit) })
  if (since) qs.set('since', since)
  const res = await fetch(`/api/teams/${teamId}/messages?${qs.toString()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to load messages: ${res.status}`)
  const json = await res.json()
  return (json.messages || []) as Message[]
}

export async function sendMessage(teamId: string, content: string, senderEmail: string, senderName?: string) {
  const res = await fetch(`/api/teams/${teamId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, senderEmail, senderName }),
  })
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  return json.message as Message
}

export async function deleteTeamMessage(teamId: string, messageId: string, requesterEmail: string) {
  const res = await fetch(`/api/teams/${teamId}/messages/${messageId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requesterEmail }),
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function listInvites(email: string): Promise<Invite[]> {
  const res = await fetch(`/api/invites?email=${encodeURIComponent(email)}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  return (json.invites || []) as Invite[]
}

export async function acceptInvite(inviteId: string, email: string): Promise<{ team_id: string }> {
  const res = await fetch(`/api/invites/${inviteId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as { team_id: string }
}

export async function declineInvite(inviteId: string): Promise<void> {
  const res = await fetch(`/api/invites/${inviteId}/decline`, { method: 'POST' })
  if (!res.ok) throw new Error(await res.text())
}

export async function listTeamMembers(teamId: string): Promise<TeamMember[]> {
  const res = await fetch(`/api/teams/${teamId}/members`, { cache: 'no-store' })
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  return (json.members || []) as TeamMember[]
}

export async function deleteTeam(teamId: string): Promise<void> {
  const res = await fetch(`/api/teams/${teamId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function leaveTeam(teamId: string, email: string): Promise<void> {
  const res = await fetch(`/api/teams/${teamId}/members/${encodeURIComponent(email)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await res.text())
}
