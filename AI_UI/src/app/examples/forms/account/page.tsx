"use client"

import * as React from "react"
import {
  BadgeCheck,
  Crown,
  Sparkles,
  Shield,
  Zap,
  Check,
  X,
  ChevronRight,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"

type SubscriptionPlan = "free" | "paid"

export default function SettingsAccountPage() {
  const [plan, setPlan] = React.useState<SubscriptionPlan>("free")
  const [loading, setLoading] = React.useState(true)
  const [userName, setUserName] = React.useState("User")
  const [userEmail, setUserEmail] = React.useState("user@example.com")
  const [userAvatar, setUserAvatar] = React.useState("")

  React.useEffect(() => {
    const loadUserAndPlan = async () => {
      setLoading(true)
      try {
        // Load user info from localStorage
        const savedData = localStorage.getItem("user_data")
        if (savedData) {
          const parsed = JSON.parse(savedData)
          if (parsed.name) setUserName(parsed.name)
          if (parsed.email) setUserEmail(parsed.email)
          if (parsed.avatar) setUserAvatar(parsed.avatar)
          if (parsed.subscription_plan) {
            setPlan(parsed.subscription_plan as SubscriptionPlan)
          }
        } else {
          const name = localStorage.getItem("user_name")
          const email = localStorage.getItem("user_email")
          const avatar = localStorage.getItem("user_avatar")
          if (name) setUserName(name)
          if (email) setUserEmail(email)
          if (avatar) setUserAvatar(avatar)
        }

        // Try to get plan from Supabase profile
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("subscription_plan")
            .eq("id", authUser.id)
            .single()

          if (profile?.subscription_plan) {
            setPlan(profile.subscription_plan as SubscriptionPlan)
          }
        }
      } catch (e) {
        console.error("Failed to load account data:", e)
      } finally {
        setLoading(false)
      }
    }

    loadUserAndPlan()
  }, [])

  const isPaid = plan === "paid"

  const features = [
    {
      label: "AI conversations",
      free: "50 / month",
      paid: "Unlimited",
      freeIncluded: true,
      paidIncluded: true,
    },
    {
      label: "Response speed",
      free: "Standard",
      paid: "Priority",
      freeIncluded: true,
      paidIncluded: true,
    },
    {
      label: "Code compilation",
      free: "Basic languages",
      paid: "All languages",
      freeIncluded: true,
      paidIncluded: true,
    },
    {
      label: "Advanced code analysis",
      free: "—",
      paid: "Included",
      freeIncluded: false,
      paidIncluded: true,
    },
    {
      label: "Team collaboration",
      free: "—",
      paid: "Up to 10 members",
      freeIncluded: false,
      paidIncluded: true,
    },
    {
      label: "Priority support",
      free: "—",
      paid: "24/7 support",
      freeIncluded: false,
      paidIncluded: true,
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Account</h3>
          <p className="text-sm text-muted-foreground">
            View your subscription plan and account details.
          </p>
        </div>
        <Separator />
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-muted-foreground/20 border-t-foreground rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading account info...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h3 className="text-lg font-medium">Account</h3>
        <p className="text-sm text-muted-foreground">
          View your subscription plan and account details.
        </p>
      </div>
      <Separator />

      {/* Current plan card */}
      <Card className="border-0 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">Current Plan</CardTitle>
              <CardDescription>
                You are currently using the{" "}
                <span className={isPaid ? "text-amber-400 font-semibold" : "text-emerald-400 font-semibold"}>
                  {isPaid ? "Paid" : "Free"}
                </span>{" "}
                version of ENGGBOT.
              </CardDescription>
            </div>
            <Badge
              className={
                isPaid
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
              }
              variant="outline"
            >
              {isPaid ? (
                <Crown className="h-3 w-3 mr-1" />
              ) : (
                <Shield className="h-3 w-3 mr-1" />
              )}
              {isPaid ? "Pro" : "Free"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* User info */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
            <Avatar className="h-12 w-12">
              <AvatarImage src={userAvatar} alt={userName} />
              <AvatarFallback className="text-sm">
                {userName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <BadgeCheck className={`h-4 w-4 ${isPaid ? "text-amber-400" : "text-emerald-400"}`} />
              <span className="text-xs text-muted-foreground">Verified</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features comparison */}
      <Card className="border-0 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">Plan Features</CardTitle>
          <CardDescription>
            Compare what&apos;s included in each plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-3 gap-4 px-4 py-3 bg-muted/30 border-b border-border/50">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Feature
              </div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">
                Free
              </div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">
                Pro
              </div>
            </div>
            {/* Table rows */}
            {features.map((feature, i) => (
              <div
                key={feature.label}
                className={`grid grid-cols-3 gap-4 px-4 py-3 items-center ${
                  i < features.length - 1 ? "border-b border-border/30" : ""
                }`}
              >
                <div className="text-sm">{feature.label}</div>
                <div className="text-center">
                  {feature.freeIncluded ? (
                    <span className="text-xs text-muted-foreground">{feature.free}</span>
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                  )}
                </div>
                <div className="text-center">
                  {feature.paidIncluded ? (
                    <span className="text-xs text-emerald-400">{feature.paid}</span>
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          {!isPaid ? (
            <Button
              className="w-full font-semibold group"
              size="lg"
              variant="default"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Upgrade to Pro
              <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Button>
          ) : (
            <div className="flex items-center gap-2 w-full p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <Crown className="h-4 w-4 text-amber-400 shrink-0" />
              <p className="text-xs text-muted-foreground">
                You&apos;re on the <span className="text-amber-400 font-medium">Pro plan</span>.
                Thank you for your support!
              </p>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
