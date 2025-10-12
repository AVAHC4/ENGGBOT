"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MoreVertical, Search, Send, Paperclip, Smile, Plus } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TeamManagementDialog } from "@/components/teams/team-management-dialog"
import { AddPeopleDialog } from "@/components/teams/add-people-dialog"
import { getCurrentUser } from "@/lib/user"
import { fetchMessages, sendMessage } from "@/lib/teams-api"
import { supabaseClient } from "@/lib/supabase-client"

interface Message {
  id: string
  sender: string
  content: string
  timestamp: string
  isOwn: boolean
  avatar?: string
  serverTs?: string
}

interface Team {
  id: string
  name: string
  lastMessage: string
  timestamp: string
  avatar?: string
  unreadCount?: number
  isOnline?: boolean
}

interface ChatInterfaceProps {
  selectedTeamId: string | null
  teams: Team[]
  onTeamNameUpdate: (teamId: string, newName: string) => void
  onTeamAvatarUpdate?: (teamId: string, newAvatar: string) => void // Added avatar update prop
}

// Messages are now loaded from the backend

const getTeamMembers = (teamId: string) => {
  const memberCounts: Record<string, number> = {
    "1": 8,
    "2": 12,
    "3": 6,
    "4": 5,
    "5": 10,
    "6": 7,
  }
  return memberCounts[teamId] || 5
}

export function ChatInterface({ selectedTeamId, teams, onTeamNameUpdate, onTeamAvatarUpdate }: ChatInterfaceProps) {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [showTeamManagement, setShowTeamManagement] = useState(false)
  const [showAddPeople, setShowAddPeople] = useState(false)

  const sseRef = useRef<EventSource | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastRefreshRef = useRef<number>(0)
  const lastServerTsRef = useRef<string | null>(null)

  // Load messages when team changes
  useEffect(() => {
    if (!selectedTeamId) {
      setMessages([])
      if (sseRef.current) {
        sseRef.current.close()
        sseRef.current = null
      }
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      return
    }

    let cancelled = false
    const load = async () => {
      try {
        const u = getCurrentUser()
        const data = await fetchMessages(selectedTeamId)
        if (cancelled) return
        const mapped: Message[] = data.map((m) => ({
          id: m.id,
          sender: m.sender_name || m.sender_email,
          content: m.content,
          timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isOwn: m.sender_email?.toLowerCase() === u.email.toLowerCase(),
          serverTs: m.created_at,
        }))
        setMessages(mapped)
        lastRefreshRef.current = Date.now()
        if (data.length > 0) {
          lastServerTsRef.current = data[data.length - 1].created_at
        }
      } catch (e) {
        console.error('Failed to fetch messages', e)
      }
    }
    load()

    // Prefer client-side Supabase realtime for near-zero latency
    let channel: ReturnType<NonNullable<typeof supabaseClient>["channel"]> | null = null
    if (supabaseClient) {
      try {
        channel = supabaseClient
          .channel(`messages-client-${selectedTeamId}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages', filter: `team_id=eq.${selectedTeamId}` },
            (payload) => {
              try {
                const row: any = payload.new
                const u = getCurrentUser()
                const msg: Message = {
                  id: row.id,
                  sender: row.sender_name || row.sender_email,
                  content: row.content,
                  timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  isOwn: row.sender_email?.toLowerCase() === u.email.toLowerCase(),
                  serverTs: row.created_at,
                }
                setMessages((prev) => (prev.some((p) => p.id === msg.id) ? prev : [...prev, msg]))
                lastRefreshRef.current = Date.now()
                lastServerTsRef.current = row.created_at
              } catch {}
            }
          )
          .subscribe()
      } catch {
        // fall back to SSE
      }
    }

    // Setup SSE stream for realtime updates (fallback / older browsers / cross-tab)
    if (sseRef.current) {
      try { sseRef.current.close() } catch {}
      sseRef.current = null
    }
    const es = new EventSource(`/api/teams/${selectedTeamId}/stream`)
    sseRef.current = es
    es.onopen = () => {
      // Connection established
      // console.log('[SSE] open')
    }
    es.onmessage = (evt) => {
      try {
        const u = getCurrentUser()
        const m = JSON.parse(evt.data)
        setMessages((prev) => {
          if (prev.some((p) => p.id === m.id)) return prev
          const msg: Message = {
            id: m.id,
            sender: m.sender_name || m.sender_email,
            content: m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isOwn: m.sender_email?.toLowerCase() === u.email.toLowerCase(),
          }
          return [...prev, msg]
        })
        lastRefreshRef.current = Date.now()
      } catch {}
    }
    es.onerror = () => {
      // keep silent; browser will auto-reconnect; fallback poll handles gaps
      // console.warn('[SSE] error')
    }

    // Ultra-low-latency polling fallback (works even if WS/SSE blocked by extensions)
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    pollRef.current = setInterval(async () => {
      try {
        const now = Date.now()
        // If no realtime push recently, fetch deltas (aggressive fallback)
        if (now - lastRefreshRef.current > 400) {
          const since = lastServerTsRef.current || undefined
          const u = getCurrentUser()
          const data = await fetchMessages(selectedTeamId, 200, since)
          if (!data || data.length === 0) return
          const mapped: Message[] = data.map((m) => ({
            id: m.id,
            sender: m.sender_name || m.sender_email,
            content: m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isOwn: m.sender_email?.toLowerCase() === u.email.toLowerCase(),
            serverTs: m.created_at,
          }))
          setMessages((prev) => {
            const seen = new Set(prev.map((p) => p.id))
            const added = mapped.filter((m) => !seen.has(m.id))
            return added.length ? [...prev, ...added] : prev
          })
          lastRefreshRef.current = Date.now()
          lastServerTsRef.current = data[data.length - 1].created_at
        }
      } catch {}
    }, 300)

    // When tab regains focus or becomes visible, refresh immediately
    const onFocus = () => load()
    const onVis = () => { if (!document.hidden) load() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)

    return () => {
      cancelled = true
      if (channel && supabaseClient) {
        try { supabaseClient.removeChannel(channel) } catch {}
        channel = null
      }
      if (sseRef.current) {
        try { sseRef.current.close() } catch {}
        sseRef.current = null
      }
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [selectedTeamId])

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedTeamId) return
    const u = getCurrentUser()
    const content = message
    setMessage("")
    try {
      const saved = await sendMessage(selectedTeamId, content, u.email, u.name)
      // Append if SSE didn't arrive yet
      setMessages((prev) => {
        if (prev.some((p) => p.id === saved.id)) return prev
        return [
          ...prev,
          {
            id: saved.id,
            sender: saved.sender_name || saved.sender_email,
            content: saved.content,
            timestamp: new Date(saved.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isOwn: true,
            serverTs: saved.created_at,
          },
        ]
      })
      lastRefreshRef.current = Date.now()
      lastServerTsRef.current = saved.created_at
    } catch (e) {
      console.error('Failed to send message', e)
      alert('Failed to send message')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!selectedTeamId) {
    return (
      <div className="flex items-center justify-center h-full bg-transparent">
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-4 rounded-full flex items-center justify-center border border-border">
            <div className="w-16 h-16 bg-foreground/20 rounded-full"></div>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Welcome to Teams</h2>
          <p className="text-muted-foreground">Select a team to start chatting</p>
        </div>
      </div>
    )
  }

  const team = teams.find((t) => t.id === selectedTeamId)
  const teamMembers = selectedTeamId ? getTeamMembers(selectedTeamId) : 0

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-transparent">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={team?.avatar || "/placeholder.svg"} alt={team?.name} />
            <AvatarFallback className="bg-muted text-muted-foreground font-medium">
              {team?.name
                .split(" ")
                .map((word) => word[0])
                .join("")
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-left cursor-pointer hover:bg-muted/50 rounded-md p-2 -m-2 transition-colors">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  {team?.name}
                  <span className="text-xs font-normal text-muted-foreground">▼</span>
                </h2>
                <p className="text-sm text-muted-foreground">{teamMembers} members</p>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel>{team?.name}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setShowTeamManagement(true)}>
                Team Info
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowAddPeople(true)}>
                Add Members
                <DropdownMenuShortcut>⌘I</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowTeamManagement(true)}>
                Edit Team
                <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                Archive Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Search className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowAddPeople(true)}>Add People</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowTeamManagement(true)}>Team Info</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowAddPeople(true)}>Add Members</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowTeamManagement(true)}>Manage Team</DropdownMenuItem>
              <DropdownMenuItem>Archive Team</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center border border-border">
                <div className="w-12 h-12 bg-muted-foreground/20 rounded-full"></div>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Start chatting with {team?.name}</h3>
              <p className="text-muted-foreground">Send a message to get the conversation started</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.isOwn ? "justify-end" : "justify-start"}`}>
              {!msg.isOwn && (
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarImage src={msg.avatar || "/placeholder.svg"} alt={msg.sender} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    {msg.sender
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={`max-w-xs lg:max-w-md ${msg.isOwn ? "order-1" : ""}`}>
                {!msg.isOwn && <p className="text-xs text-muted-foreground mb-1 px-3">{msg.sender}</p>}
                <div
                  className={`rounded-lg px-3 py-2 ${
                    msg.isOwn ? "bg-foreground text-background ml-auto" : "bg-transparent border border-border"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-xs mt-1 ${msg.isOwn ? "text-background/70" : "text-muted-foreground"}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-border p-4 bg-transparent">
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
            <Paperclip className="h-4 w-4" />
          </Button>
          <div className="flex-1 relative">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pr-10 resize-none"
            />
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7">
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleSendMessage} disabled={!message.trim()} size="icon" className="h-9 w-9 flex-shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <TeamManagementDialog
        open={showTeamManagement}
        onOpenChange={setShowTeamManagement}
        teamId={selectedTeamId}
        teamName={team?.name || ""}
        teamAvatar={team?.avatar}
        onTeamNameUpdate={onTeamNameUpdate}
        onTeamAvatarUpdate={onTeamAvatarUpdate} // Added avatar update callback
      />

      <AddPeopleDialog
        open={showAddPeople}
        onOpenChange={setShowAddPeople}
        teamId={selectedTeamId}
        teamName={team?.name || ""}
      />
    </div>
  )
}
