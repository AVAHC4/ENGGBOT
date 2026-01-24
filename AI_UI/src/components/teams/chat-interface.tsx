"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MoreVertical, Search, Paperclip, Smile, Plus, X, Sparkles } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { TeamManagementDialog } from "@/components/teams/team-management-dialog"
import { AddPeopleDialog } from "@/components/teams/add-people-dialog"
import { getCurrentUser } from "@/lib/user"
import { deleteTeamMessage, fetchMessages, sendMessage, listTeamMembers } from "@/lib/teams-api"
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
  onTeamAvatarUpdate?: (teamId: string, newAvatar: string) => void
  onLeaveTeam?: (teamId: string) => void
}





const encodeKeyPart = (value: string) => {
  try {
    return btoa(encodeURIComponent(value.toLowerCase()))
  } catch {
    return value.toLowerCase()
  }
}

const getHiddenStorageKey = (teamId: string, email: string) => {
  return `teams-hidden-${teamId}-${encodeKeyPart(email)}`
}

const loadHiddenMessages = (teamId: string, email: string) => {
  try {
    const stored = localStorage.getItem(getHiddenStorageKey(teamId, email))
    if (!stored) return new Set<string>()
    const parsed = JSON.parse(stored)
    if (Array.isArray(parsed)) {
      return new Set<string>(parsed)
    }
    return new Set<string>()
  } catch {
    return new Set<string>()
  }
}

const persistHiddenMessages = (teamId: string, email: string, ids: Set<string>) => {
  try {
    localStorage.setItem(getHiddenStorageKey(teamId, email), JSON.stringify(Array.from(ids)))
  } catch {

  }
}

export function ChatInterface({ selectedTeamId, teams, onTeamNameUpdate, onTeamAvatarUpdate, onLeaveTeam }: ChatInterfaceProps) {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [showTeamManagement, setShowTeamManagement] = useState(false)
  const [showAddPeople, setShowAddPeople] = useState(false)
  const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: Message } | null>(null)
  const [teamMembers, setTeamMembers] = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)

  const sseRef = useRef<EventSource | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastRefreshRef = useRef<number>(0)
  const lastServerTsRef = useRef<string | null>(null)
  const hiddenMessageIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    hiddenMessageIdsRef.current = hiddenMessageIds
  }, [hiddenMessageIds])

  useEffect(() => {
    if (!selectedTeamId) {
      const empty = new Set<string>()
      setHiddenMessageIds(empty)
      hiddenMessageIdsRef.current = empty
      return
    }
    const user = getCurrentUser()
    const loaded = loadHiddenMessages(selectedTeamId, user.email)
    hiddenMessageIdsRef.current = loaded
    setHiddenMessageIds(loaded)
  }, [selectedTeamId])

  useEffect(() => {
    const closeMenu = () => setContextMenu(null)
    window.addEventListener('click', closeMenu)
    window.addEventListener('scroll', closeMenu, true)
    window.addEventListener('resize', closeMenu)
    return () => {
      window.removeEventListener('click', closeMenu)
      window.removeEventListener('scroll', closeMenu, true)
      window.removeEventListener('resize', closeMenu)
    }
  }, [])


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
        const visible = mapped.filter((m) => !hiddenMessageIdsRef.current.has(m.id))
        setMessages(visible)
        lastRefreshRef.current = Date.now()
        if (data.length > 0) {
          lastServerTsRef.current = data[data.length - 1].created_at
        }
      } catch (e) {
        console.error('Failed to fetch messages', e)
      }
    }
    load()


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
                if (hiddenMessageIdsRef.current.has(msg.id)) {
                  return
                }
                setMessages((prev) => (prev.some((p) => p.id === msg.id) ? prev : [...prev, msg]))
                lastRefreshRef.current = Date.now()
                lastServerTsRef.current = row.created_at
              } catch { }
            }
          )
          .subscribe()
      } catch {

      }
    }


    if (sseRef.current) {
      try { sseRef.current.close() } catch { }
      sseRef.current = null
    }
    const es = new EventSource(`/api/teams/${selectedTeamId}/stream`)
    sseRef.current = es
    es.onopen = () => {


    }
    es.onmessage = (evt) => {
      try {
        const u = getCurrentUser()
        const m = JSON.parse(evt.data)
        if (hiddenMessageIdsRef.current.has(m.id)) {
          return
        }
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
      } catch { }
    }
    es.onerror = () => {


    }


    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    pollRef.current = setInterval(async () => {
      try {
        const now = Date.now()

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
          const filtered = mapped.filter((m) => !hiddenMessageIdsRef.current.has(m.id))
          setMessages((prev) => {
            const seen = new Set(prev.map((p) => p.id))
            const added = filtered.filter((m) => !seen.has(m.id))
            return added.length ? [...prev, ...added] : prev
          })
          lastRefreshRef.current = Date.now()
          lastServerTsRef.current = data[data.length - 1].created_at
        }
      } catch { }
    }, 300)


    const onFocus = () => load()
    const onVis = () => { if (!document.hidden) load() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)

    return () => {
      cancelled = true
      if (channel && supabaseClient) {
        try { supabaseClient.removeChannel(channel) } catch { }
        channel = null
      }
      if (sseRef.current) {
        try { sseRef.current.close() } catch { }
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


  useEffect(() => {
    if (selectedTeamId) {
      listTeamMembers(selectedTeamId)
        .then(members => setTeamMembers(members.length))
        .catch(() => setTeamMembers(0))
    } else {
      setTeamMembers(0)
    }
  }, [selectedTeamId])

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedTeamId) return
    const u = getCurrentUser()
    const content = message
    setMessage("")
    try {
      const saved = await sendMessage(selectedTeamId, content, u.email, u.name)

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

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>, msg: Message) => {
    event.preventDefault()
    const target = event.currentTarget
    const rect = target.getBoundingClientRect()
    setContextMenu({
      x: rect.left,
      y: rect.top + rect.height / 2,
      message: msg,
    })
  }

  const handleDeleteForMe = (msg: Message) => {
    if (!selectedTeamId) return
    const u = getCurrentUser()
    const next = new Set(hiddenMessageIdsRef.current)
    next.add(msg.id)
    hiddenMessageIdsRef.current = next
    setHiddenMessageIds(next)
    persistHiddenMessages(selectedTeamId, u.email, next)
    setMessages((prev) => prev.filter((m) => m.id !== msg.id))
    setContextMenu(null)
  }

  const handleDeleteForEveryone = async (msg: Message) => {
    if (!selectedTeamId) return
    const u = getCurrentUser()
    try {
      await deleteTeamMessage(selectedTeamId, msg.id, u.email)
      setMessages((prev) => prev.filter((m) => m.id !== msg.id))
    } catch (error) {
      console.error('Failed to delete message', error)
      alert('Unable to delete message for everyone')
    } finally {
      setContextMenu(null)
    }
  }

  if (!selectedTeamId) {
    return (
      <div className="flex items-center justify-center h-full bg-transparent">
        <div className="text-center">
          { }
          <div className="w-40 h-40 mx-auto mb-6 rounded-full flex items-center justify-center opacity-15">
            <div className="w-32 h-32 rounded-full flex items-center justify-center bg-muted">
              <svg className="w-16 h-16 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-foreground">Welcome to Teams</h2>
          <p className="text-muted-foreground">Select a team to start chatting</p>
        </div>
      </div>
    )
  }

  const team = teams.find((t) => t.id === selectedTeamId)

  return (
    <div className="flex flex-col h-full bg-transparent">
      { }
      <div
        className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10 backdrop-blur-md rounded-t-xl bg-black/[0.02] dark:bg-white/[0.05]"
      >
        <div
          className="cursor-pointer rounded-md py-2 px-3 -my-2 -ml-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5 flex-1 flex items-center gap-3 mr-4"
          onClick={() => setShowTeamManagement(true)}
        >
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={team?.avatar || "/placeholder.svg"} alt={team?.name} />
            <AvatarFallback className="font-medium bg-muted text-muted-foreground">
              {team?.name
                .split(" ")
                .map((word) => word[0])
                .join("")
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-foreground">{team?.name}</h2>
            <div className="flex items-center gap-2">
              { }
              <div className="flex -space-x-2">
                {[...Array(Math.min(3, teamMembers))].map((_, i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded-full border-2 border-background flex items-center justify-center text-[8px] font-medium text-white"
                    style={{ background: `hsl(${(i * 60) + 200}, 60%, 50%)` }}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">{teamMembers} members</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={`h-9 w-9 ${showSearch ? 'text-primary' : 'text-muted-foreground'}`}
            onClick={() => {
              setShowSearch(!showSearch)
              if (!showSearch) {
                setTimeout(() => searchInputRef.current?.focus(), 100)
              } else {
                setSearchQuery("")
              }
            }}
          >
            <Search className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowAddPeople(true)}>Add People</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
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

      {showSearch && (
        <div className="px-6 py-3 border-b border-border bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("")
                  setShowSearch(false)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-muted-foreground mt-2">
              {messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()) || m.sender.toLowerCase().includes(searchQuery.toLowerCase())).length} results found
            </p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              { }
              <div className="w-32 h-32 mx-auto mb-6 rounded-full flex items-center justify-center opacity-15">
                <div className="w-28 h-28 rounded-full flex items-center justify-center bg-muted">
                  <svg className="w-14 h-14 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium mb-2 text-foreground">Start chatting with {team?.name}</h3>
              <p className="text-muted-foreground">Send a message to get the conversation started</p>
            </div>
          </div>
        ) : (
          messages
            .filter((msg) => {
              if (!searchQuery) return true
              const query = searchQuery.toLowerCase()
              return msg.content.toLowerCase().includes(query) || msg.sender.toLowerCase().includes(query)
            })
            .map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.isOwn ? "justify-end" : "justify-start"}`}
                onContextMenu={(event) => handleContextMenu(event, msg)}
              >
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
                    className={`rounded-xl px-4 py-2.5 backdrop-blur-md border ${msg.isOwn ? "bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/15 text-foreground ml-auto" : "bg-black/[0.03] dark:bg-white/8 border-black/5 dark:border-white/10 text-foreground"
                      }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 min-w-[180px] rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
          style={{
            top: contextMenu.y,
            left: contextMenu.x - 8,
            transform: 'translate(-100%, -50%)',
          }}
        >
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => handleDeleteForMe(contextMenu.message)}
          >
            Delete for me
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
            onClick={() => handleDeleteForEveryone(contextMenu.message)}
          >
            Delete for everyone
          </button>
        </div>
      )}

      { }
      <div className="p-4 pb-6 bg-transparent">
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-black/10 dark:border-white/15 backdrop-blur-md bg-black/[0.02] dark:bg-white/[0.05]"
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex-shrink-0 rounded-full text-muted-foreground"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0 rounded-full text-muted-foreground"
          >
            <Smile className="h-4 w-4" />
          </Button>
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className={`h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-200 border border-black/10 dark:border-white/10 ${message.trim() ? 'bg-black/5 dark:bg-white/15' : 'bg-transparent'}`}
          >
            <Sparkles className={`h-5 w-5 ${message.trim() ? 'text-foreground' : 'text-muted-foreground'}`} />
          </button>
        </div>
      </div>

      <TeamManagementDialog
        open={showTeamManagement}
        onOpenChange={setShowTeamManagement}
        teamId={selectedTeamId}
        teamName={team?.name || ""}
        teamAvatar={team?.avatar}
        onTeamNameUpdate={onTeamNameUpdate}
        onTeamAvatarUpdate={onTeamAvatarUpdate}
        onLeaveTeam={onLeaveTeam}
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
