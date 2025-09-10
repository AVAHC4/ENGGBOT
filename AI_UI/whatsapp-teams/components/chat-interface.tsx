"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MoreVertical, Search, Send, Paperclip, Smile, Plus, Mic, Square } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { TeamManagementDialog } from "./team-management-dialog"
import { AddPeopleDialog } from "./add-people-dialog"

interface Message {
  id: string
  sender: string
  content: string
  timestamp: string
  isOwn: boolean
  avatar?: string
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
}

const sampleMessages: Record<string, Message[]> = {
  "1": [
    {
      id: "1",
      sender: "Sarah Johnson",
      content:
        "Hey everyone! I've just uploaded the new mockups to Figma. Could you all take a look and share your thoughts?",
      timestamp: "2:30 PM",
      isOwn: false,
      avatar: "/placeholder.svg",
    },
    {
      id: "2",
      sender: "You",
      content: "Great work Sarah! The new color scheme looks much better. I especially like the updated navigation.",
      timestamp: "2:32 PM",
      isOwn: true,
    },
    {
      id: "3",
      sender: "Mike Chen",
      content: "Agreed! The user flow is much cleaner now. Should we schedule a review meeting for tomorrow?",
      timestamp: "2:33 PM",
      isOwn: false,
      avatar: "/placeholder.svg",
    },
    {
      id: "4",
      sender: "Sarah Johnson",
      content: "Perfect! I'll send out a calendar invite for 2 PM tomorrow. Thanks for the quick feedback everyone!",
      timestamp: "2:34 PM",
      isOwn: false,
      avatar: "/placeholder.svg",
    },
  ],
  "2": [
    {
      id: "1",
      sender: "Mike Chen",
      content: "The latest deployment to staging went smoothly. All tests are passing!",
      timestamp: "1:40 PM",
      isOwn: false,
      avatar: "/placeholder.svg",
    },
    {
      id: "2",
      sender: "Alex Rodriguez",
      content: "Excellent! I'll start the QA process now. Should have results by end of day.",
      timestamp: "1:42 PM",
      isOwn: false,
      avatar: "/placeholder.svg",
    },
    {
      id: "3",
      sender: "You",
      content: "Thanks team! Let me know if you need any help with the testing.",
      timestamp: "1:45 PM",
      isOwn: true,
    },
  ],
}

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
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const currentMessages = selectedTeamId ? sampleMessages[selectedTeamId] || [] : []

  const handleSendMessage = () => {
    if (!message.trim() || !selectedTeamId) return

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "You",
      content: message,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isOwn: true,
    }

    setMessages((prev) => [...prev, newMessage])
    setMessage("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const transcribeBlob = async (blob: Blob) => {
    setIsTranscribing(true)
    try {
      const form = new FormData()
      form.append("file", blob, "audio.webm")
      const res = await fetch("/api/transcribe", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "Transcription failed")
      }
      const transcript = typeof data.output === "string" ? data.output : JSON.stringify(data.output)
      setMessage((prev) => (prev ? prev + " " : "") + transcript)
    } catch (err: any) {
      console.error(err)
      alert(err?.message || "Transcription error")
    } finally {
      setIsTranscribing(false)
    }
  }

  const startRecording = async () => {
    try {
      if (typeof window === "undefined" || !("MediaRecorder" in window)) {
        alert("Your browser does not support audio recording.")
        return
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeCandidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ]
      const supportedMime = mimeCandidates.find((m) => (window as any).MediaRecorder?.isTypeSupported?.(m)) || "audio/webm"
      const mr = new MediaRecorder(stream, { mimeType: supportedMime })
      mediaRecorderRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = (e: any) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: mr.mimeType })
          await transcribeBlob(blob)
        } finally {
          stream.getTracks().forEach((t) => t.stop())
          setIsRecording(false)
        }
      }
      mr.start()
      setIsRecording(true)
    } catch (err) {
      console.error(err)
      alert("Microphone permission denied or unavailable")
    }
  }

  const stopRecording = () => {
    try {
      mediaRecorderRef.current?.stop()
    } catch (err) {
      console.error(err)
    }
  }

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording()
    } else {
      await startRecording()
    }
  }

  useEffect(() => {
    return () => {
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop()
        }
      } catch {}
    }
  }, [])

  if (!selectedTeamId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <div className="w-16 h-16 bg-muted-foreground/20 rounded-full"></div>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Welcome to Teams</h2>
          <p className="text-muted-foreground">Select a team to start chatting</p>
        </div>
      </div>
    )
  }

  const team = teams.find((t) => t.id === selectedTeamId)
  const teamMembers = selectedTeamId ? getTeamMembers(selectedTeamId) : 0
  const allMessages = [...currentMessages, ...messages]

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
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
          <div
            className="cursor-pointer hover:bg-muted/50 rounded-md p-2 -m-2 transition-colors"
            onClick={() => setShowTeamManagement(true)}
          >
            <h2 className="font-semibold text-foreground">{team?.name}</h2>
            <p className="text-sm text-muted-foreground">{teamMembers} members</p>
          </div>
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {allMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <div className="w-12 h-12 bg-muted-foreground/20 rounded-full"></div>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Start chatting with {team?.name}</h3>
              <p className="text-muted-foreground">Send a message to get the conversation started</p>
            </div>
          </div>
        ) : (
          allMessages.map((msg) => (
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
                    msg.isOwn ? "bg-foreground text-background ml-auto" : "bg-background border border-border"
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

      <div className="border-t border-border p-4">
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
            <Paperclip className="h-4 w-4" />
          </Button>
          <div className="flex-1 relative">
            <Input
              placeholder={isTranscribing ? "Transcribing audio..." : "Type a message..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pr-10 resize-none"
            />
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7">
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={toggleRecording}
            variant={isRecording ? "destructive" : "default"}
            disabled={isTranscribing}
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            aria-label={isRecording ? "Stop recording" : "Start recording"}
            title={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button onClick={handleSendMessage} disabled={!message.trim() || isTranscribing} size="icon" className="h-9 w-9 flex-shrink-0">
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
