export type Team = {
  id: string
  name: string
  created_at?: string
  created_by_email?: string
}

export type Message = {
  id: string
  team_id: string
  sender_email: string
  sender_name?: string | null
  content: string
  created_at: string
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

export async function fetchMessages(teamId: string, limit = 200) {
  const res = await fetch(`/api/teams/${teamId}/messages?limit=${limit}`, { cache: 'no-store' })
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
