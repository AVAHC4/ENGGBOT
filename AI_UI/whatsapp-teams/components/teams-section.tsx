import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface Team {
  id: string
  name: string
  lastMessage: string
  timestamp: string
  avatar?: string
  unreadCount?: number
  isOnline?: boolean
}

const teams: Team[] = [
  {
    id: "1",
    name: "Design Team",
    lastMessage: "Sarah: The new mockups are ready for review",
    timestamp: "2:34 PM",
    unreadCount: 3,
    isOnline: true,
  },
  {
    id: "2",
    name: "Development Team",
    lastMessage: "Mike: Deployed the latest changes to staging",
    timestamp: "1:45 PM",
    unreadCount: 1,
    isOnline: true,
  },
  {
    id: "3",
    name: "Marketing Team",
    lastMessage: "Lisa: Campaign performance looks great this week",
    timestamp: "12:30 PM",
    isOnline: false,
  },
  {
    id: "4",
    name: "Product Team",
    lastMessage: "Alex: User feedback from the beta is very positive",
    timestamp: "11:15 AM",
    isOnline: true,
  },
  {
    id: "5",
    name: "Sales Team",
    lastMessage: "John: Q4 targets are looking achievable",
    timestamp: "Yesterday",
    isOnline: false,
  },
  {
    id: "6",
    name: "Support Team",
    lastMessage: "Emma: Ticket volume is down 20% this month",
    timestamp: "Yesterday",
    unreadCount: 2,
    isOnline: true,
  },
]

export function TeamsSection() {
  return (
    <div className="max-w-md mx-auto border-x border-border min-h-screen">
      { }
      <div className="sticky top-0 border-b border-border px-4 py-3">
        <h1 className="text-xl font-semibold text-foreground">Teams</h1>
      </div>

      { }
      <div className="divide-y divide-border">
        {teams.map((team) => (
          <div
            key={team.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
          >
            { }
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

            { }
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium text-foreground truncate">{team.name}</h3>
                <span className="text-xs text-muted-foreground flex-shrink-0">{team.timestamp}</span>
              </div>
              <p className="text-sm text-muted-foreground truncate">{team.lastMessage}</p>
            </div>

            { }
            {team.unreadCount && (
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
    </div>
  )
}
