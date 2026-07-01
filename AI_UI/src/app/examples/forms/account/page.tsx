"use client"

import * as React from "react"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"

type SubscriptionPlan = "free" | "paid"

function getUserData() {
  if (typeof window === "undefined") return { name: "User", email: "user@example.com", avatar: "" }
  try {
    const savedData = localStorage.getItem("user_data")
    if (savedData) {
      const parsed = JSON.parse(savedData)
      return {
        name: parsed.name || localStorage.getItem("user_name") || "User",
        email: parsed.email || localStorage.getItem("user_email") || "user@example.com",
        avatar: parsed.avatar || localStorage.getItem("user_avatar") || "",
      }
    }
    return {
      name: localStorage.getItem("user_name") || "User",
      email: localStorage.getItem("user_email") || "user@example.com",
      avatar: localStorage.getItem("user_avatar") || "",
    }
  } catch {
    return { name: "User", email: "user@example.com", avatar: "" }
  }
}

export default function SettingsAccountPage() {
  const [plan, setPlan] = React.useState<SubscriptionPlan>("free")
  const [loading, setLoading] = React.useState(true)
  const [user, setUser] = React.useState({ name: "User", email: "user@example.com", avatar: "" })

  React.useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        setUser(getUserData())

        // Check localStorage for plan
        const savedData = localStorage.getItem("user_data")
        if (savedData) {
          const parsed = JSON.parse(savedData)
          if (parsed.subscription_plan) {
            setPlan(parsed.subscription_plan as SubscriptionPlan)
          }
        }

        // Check Supabase for plan
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
    load()
  }, [])

  const isPaid = plan === "paid"

  const features = [
    { label: "AI conversations", free: true, paid: true, freeDetail: "50 / month", paidDetail: "Unlimited" },
    { label: "Standard response speed", free: true, paid: true, freeDetail: "Included", paidDetail: "Priority" },
    { label: "Code compilation", free: true, paid: true, freeDetail: "Basic languages", paidDetail: "All languages" },
    { label: "Advanced code analysis", free: false, paid: true, freeDetail: "", paidDetail: "Included" },
    { label: "Team collaboration", free: false, paid: true, freeDetail: "", paidDetail: "Up to 10 members" },
    { label: "Priority support", free: false, paid: true, freeDetail: "", paidDetail: "24/7 support" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Account</h3>
        <p className="text-sm text-muted-foreground">
          View your subscription plan and account details.
        </p>
      </div>
      <Separator />

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-2 border-muted-foreground/20 border-t-foreground rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Subscription status */}
          <div>
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Subscription
            </label>
            <p className="text-sm text-muted-foreground mt-1 mb-3">
              You are currently on the {isPaid ? "Paid" : "Free"} plan.
            </p>
            <div className="flex items-center gap-3 rounded-md border p-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
              </div>
              <Badge variant={isPaid ? "default" : "secondary"}>
                {isPaid ? "Pro" : "Free"}
              </Badge>
            </div>
          </div>

          {/* Plan features */}
          <div>
            <label className="text-sm font-medium leading-none">
              Plan features
            </label>
            <p className="text-sm text-muted-foreground mt-1 mb-3">
              What&apos;s included in your current plan.
            </p>
            <div className="space-y-3">
              {features.map((feature) => {
                const included = isPaid ? feature.paid : feature.free
                const detail = isPaid ? feature.paidDetail : feature.freeDetail
                return (
                  <div key={feature.label} className="flex flex-row items-start space-x-3 space-y-0">
                    <Checkbox checked={included} disabled className="mt-0.5" />
                    <div className="space-y-0.5">
                      <label className="text-sm font-normal leading-none">
                        {feature.label}
                      </label>
                      {detail && (
                        <p className="text-xs text-muted-foreground">
                          {detail}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Upgrade / status */}
          {!isPaid ? (
            <Button>Upgrade to Pro</Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              You&apos;re on the Pro plan. Thank you for your support!
            </p>
          )}
        </div>
      )}
    </div>
  )
}
