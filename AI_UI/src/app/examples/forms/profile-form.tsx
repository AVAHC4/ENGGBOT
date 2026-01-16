"use client"

import * as React from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const profileFormSchema = z.object({
  username: z
    .string()
    .min(2, {
      message: "Username must be at least 2 characters.",
    })
    .max(30, {
      message: "Username must not be longer than 30 characters.",
    }),
  email: z
    .string({
      required_error: "Please select an email to display.",
    })
    .email(),
  bio: z.string().max(160).min(4),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>


function getUserEmail(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const userData = localStorage.getItem('user_data')
    if (userData) {
      const parsed = JSON.parse(userData)
      return parsed.email || null
    }
    return localStorage.getItem('user_email') || null
  } catch {
    return null
  }
}

export function ProfileForm() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = React.useState(true)
  const [open, setOpen] = React.useState(false)
  const [pendingData, setPendingData] = React.useState<ProfileFormValues | null>(null)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: "",
      email: "",
      bio: "I own a computer.",
    },
    mode: "onChange",
  })




  React.useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const email = getUserEmail()
        if (!email) {
          setIsLoading(false)
          return
        }


        form.setValue("email", email)


        const response = await fetch(`/api/settings?email=${encodeURIComponent(email)}`)
        if (response.ok) {
          const { settings } = await response.json()
          if (settings) {
            if (settings.username) form.setValue("username", settings.username)
            if (settings.bio) form.setValue("bio", settings.bio)
          }
        }
      } catch (e) {
        console.error("Failed to load profile data:", e)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [form])

  async function onConfirmSave(data: ProfileFormValues) {
    setOpen(false)
    try {
      const email = getUserEmail()
      if (!email) {
        toast({
          title: "Error",
          description: "No user email found. Please log in first.",
          variant: "destructive",
        })
        return
      }


      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          username: data.username,
          bio: data.bio,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save to database')
      }


      const savedData = localStorage.getItem("user_data")
      let currentData: any = {}
      try {
        currentData = savedData ? JSON.parse(savedData) : {}
      } catch {

      }
      localStorage.setItem("user_data", JSON.stringify({
        ...currentData,
        username: data.username,
        bio: data.bio,
      }))
      localStorage.setItem("user_name", data.username)

      // Dispatch storage event with the key so sidebar can detect the change in the same tab
      window.dispatchEvent(new StorageEvent("storage", {
        key: "user_name",
        newValue: data.username,
      }))

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      })
    } catch (e) {
      console.error("Error saving profile:", e)
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      })
    }
  }

  function onSubmit(data: ProfileFormValues) {
    setPendingData(data)
    setOpen(true)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="shadcn" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name. It can be your real name or a
                pseudonym. You can only change this once every 30 days.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a verified email to display" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={field.value || "m@example.com"}>{field.value || "m@example.com"}</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                You can manage verified email addresses in your{" "}
                <Link href="/examples/forms">email settings</Link>.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us a little bit about yourself"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                You can <span>@mention</span> other users and organizations to
                link to them.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Update profile</Button>
      </form>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will update your public profile information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingData && onConfirmSave(pendingData)}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form >
  )
}
