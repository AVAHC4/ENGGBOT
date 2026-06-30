"use client"

import * as React from "react"
import {
  BadgeCheck,
  Crown,
  Sparkles,
  Shield,
  Zap,
  ChevronRight,
  X,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

type SubscriptionPlan = "free" | "paid"

interface AccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    name: string
    email: string
    avatar: string
  }
}

export function AccountDialog({ open, onOpenChange, user }: AccountDialogProps) {
  const [plan, setPlan] = React.useState<SubscriptionPlan>("free")
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!open) return

    const fetchPlan = async () => {
      setLoading(true)
      try {
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
            setLoading(false)
            return
          }
        }

        // Fallback: check localStorage
        const savedData = localStorage.getItem("user_data")
        if (savedData) {
          const parsed = JSON.parse(savedData)
          if (parsed.subscription_plan) {
            setPlan(parsed.subscription_plan as SubscriptionPlan)
            setLoading(false)
            return
          }
        }

        // Default to free
        setPlan("free")
      } catch (e) {
        console.error("Failed to fetch subscription plan:", e)
        setPlan("free")
      } finally {
        setLoading(false)
      }
    }

    fetchPlan()
  }, [open])

  const isPaid = plan === "paid"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-0 bg-zinc-950 text-white shadow-2xl shadow-black/60">
        {/* Decorative gradient header */}
        <div className="relative">
          {/* Background gradient */}
          <div
            className={`h-32 w-full ${
              isPaid
                ? "bg-gradient-to-br from-amber-500/30 via-orange-500/20 to-yellow-600/10"
                : "bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-cyan-500/5"
            }`}
          />
          {/* Animated glow orb */}
          <div
            className={`absolute top-4 right-8 w-24 h-24 rounded-full blur-3xl opacity-40 ${
              isPaid ? "bg-amber-400" : "bg-emerald-400"
            }`}
            style={{ animation: "pulse 3s ease-in-out infinite" }}
          />
          {/* Plan badge */}
          <div className="absolute -bottom-6 left-6">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border backdrop-blur-sm ${
                isPaid
                  ? "bg-amber-500/20 border-amber-500/30 text-amber-300"
                  : "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
              }`}
            >
              {isPaid ? (
                <Crown className="h-5 w-5" />
              ) : (
                <Shield className="h-5 w-5" />
              )}
              <span className="text-sm font-semibold tracking-wide uppercase">
                {isPaid ? "Pro Plan" : "Free Plan"}
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 pt-10 pb-6 space-y-6">
          {/* Header */}
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-semibold text-zinc-100">
              Account Overview
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm">
              You are currently using the{" "}
              <span
                className={`font-semibold ${
                  isPaid ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                {isPaid ? "Paid" : "Free"}
              </span>{" "}
              version of ENGGBOT.
            </DialogDescription>
          </DialogHeader>

          {/* User info card */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/60">
            <div className="relative shrink-0">
              <img
                src={user.avatar || "https://ferf1mheo22r9ira.public.blob.vercel-storage.com/avatar-02-albo9B0tWOSLXCVZh9rX9KFxXIVWMr.png"}
                alt={user.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-zinc-700"
              />
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-zinc-900 ${
                  isPaid ? "bg-amber-400" : "bg-emerald-400"
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-100 truncate">
                {user.name}
              </p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                isPaid
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                  : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
              }`}
            >
              <BadgeCheck className="h-3.5 w-3.5" />
              {isPaid ? "Pro" : "Free"}
            </div>
          </div>

          {/* Version details */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Your Plan Includes
            </h3>
            <div className="space-y-2">
              {(isPaid
                ? [
                    { icon: Zap, label: "Unlimited AI conversations", active: true },
                    { icon: Sparkles, label: "Priority response speed", active: true },
                    { icon: Crown, label: "Advanced code analysis", active: true },
                    { icon: Shield, label: "Premium support", active: true },
                  ]
                : [
                    { icon: Zap, label: "Basic AI conversations", active: true },
                    { icon: Sparkles, label: "Standard response speed", active: true },
                    { icon: Crown, label: "Advanced code analysis", active: false },
                    { icon: Shield, label: "Premium support", active: false },
                  ]
              ).map((feature, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    feature.active
                      ? "text-zinc-200"
                      : "text-zinc-600"
                  }`}
                >
                  <feature.icon
                    className={`h-4 w-4 shrink-0 ${
                      feature.active
                        ? isPaid
                          ? "text-amber-400"
                          : "text-emerald-400"
                        : "text-zinc-700"
                    }`}
                  />
                  <span className="text-sm">{feature.label}</span>
                  {!feature.active && (
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-zinc-600 bg-zinc-800/60 px-2 py-0.5 rounded-full">
                      Pro
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          {!isPaid && (
            <Button
              className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 group"
              onClick={() => onOpenChange(false)}
            >
              <Sparkles className="h-4 w-4 mr-2 group-hover:animate-spin" />
              Upgrade to Pro
              <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Button>
          )}

          {isPaid && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <Crown className="h-4 w-4 text-amber-400 shrink-0" />
              <p className="text-xs text-zinc-400">
                You&apos;re on the <span className="text-amber-400 font-medium">Pro plan</span>. 
                Thank you for your support!
              </p>
            </div>
          )}
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-zinc-700 border-t-emerald-400 rounded-full animate-spin" />
              <p className="text-xs text-zinc-500">Loading account info...</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
