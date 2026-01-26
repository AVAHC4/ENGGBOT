"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Archive, RotateCcw } from "lucide-react"
import { listArchivedTeams, unarchiveTeam, type Team } from "@/lib/teams-api"
import { getCurrentUser } from "@/lib/user"

interface ArchivedTeamsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onTeamRestored?: () => void
}

export function ArchivedTeamsDialog({ open, onOpenChange, onTeamRestored }: ArchivedTeamsDialogProps) {
    const [archivedTeams, setArchivedTeams] = useState<Team[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [restoringId, setRestoringId] = useState<string | null>(null)

    const loadArchivedTeams = async () => {
        setIsLoading(true)
        try {
            const user = getCurrentUser()
            const teams = await listArchivedTeams(user.email)
            setArchivedTeams(teams)
        } catch (error) {
            console.error("Failed to load archived teams:", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (open) {
            loadArchivedTeams()
        }
    }, [open])

    const handleRestore = async (teamId: string) => {
        setRestoringId(teamId)
        try {
            await unarchiveTeam(teamId)
            setArchivedTeams((prev) => prev.filter((team) => team.id !== teamId))
            if (onTeamRestored) {
                onTeamRestored()
            }
        } catch (error) {
            console.error("Failed to restore team:", error)
            alert("Failed to restore team. Please try again.")
        } finally {
            setRestoringId(null)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Archive className="h-5 w-5" />
                        Archived Teams
                    </DialogTitle>
                    <DialogDescription>
                        Teams you have archived. Restore them to see them in your teams list again.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                        </div>
                    ) : archivedTeams.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Archive className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No archived teams</p>
                        </div>
                    ) : (
                        archivedTeams.map((team) => (
                            <div
                                key={team.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-border"
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src="/placeholder.svg" alt={team.name} />
                                        <AvatarFallback className="bg-muted text-muted-foreground">
                                            {team.name
                                                .split(" ")
                                                .map((word) => word[0])
                                                .join("")
                                                .slice(0, 2)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{team.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Archived
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRestore(team.id)}
                                    disabled={restoringId === team.id}
                                >
                                    {restoringId === team.id ? (
                                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                    ) : (
                                        <>
                                            <RotateCcw className="h-4 w-4 mr-1" />
                                            Restore
                                        </>
                                    )}
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
