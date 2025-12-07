"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"

import * as React from "react"

// Helper function to get user email from localStorage
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

const items = [
  {
    id: "chat",
    label: "Chat",
  },
  {
    id: "compiler",
    label: "Compiler",
  },
  {
    id: "teams",
    label: "Teams",
  },
  {
    id: "projects",
    label: "Projects",
  },
] as const

const displayFormSchema = z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one item.",
  }),
})

type DisplayFormValues = z.infer<typeof displayFormSchema>

// This can come from your database or API.
const defaultValues: Partial<DisplayFormValues> = {
  items: ["chat", "compiler", "teams", "projects"],
}

export function DisplayForm() {
  const { toast } = useToast()
  const form = useForm<DisplayFormValues>({
    resolver: zodResolver(displayFormSchema),
    defaultValues,
  })

  // Load saved preferences on mount
  React.useEffect(() => {
    const loadData = async () => {
      // Load from localStorage first for immediate display
      const savedItems = localStorage.getItem("sidebar_preferences")
      if (savedItems) {
        try {
          const parsed = JSON.parse(savedItems)
          form.setValue("items", parsed)
        } catch (e) {
          console.error("Failed to parse sidebar preferences", e)
        }
      }

      // Then try to load from database
      const email = getUserEmail()
      if (email) {
        try {
          const response = await fetch(`/api/settings?email=${encodeURIComponent(email)}`)
          if (response.ok) {
            const { settings } = await response.json()
            if (settings && settings.sidebar_items) {
              form.setValue("items", settings.sidebar_items)
            }
          }
        } catch (e) {
          console.error("Failed to load display settings from database:", e)
        }
      }
    }

    loadData()
  }, [form])

  async function onSubmit(data: DisplayFormValues) {
    // Save to localStorage for immediate sidebar updates
    localStorage.setItem("sidebar_preferences", JSON.stringify(data.items))
    window.dispatchEvent(new Event("storage"))

    // Save to database
    const email = getUserEmail()
    if (email) {
      try {
        const response = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            sidebar_items: data.items,
          }),
        })

        if (!response.ok) {
          console.error('Failed to save display settings to database')
        }
      } catch (e) {
        console.error('Error saving display settings:', e)
      }
    }

    toast({
      title: "Display settings updated",
      description: "Your sidebar preferences have been saved.",
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="items"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Sidebar</FormLabel>
                <FormDescription>
                  Select the items you want to display in the sidebar.
                </FormDescription>
              </div>
              {items.map((item) => (
                <FormField
                  key={item.id}
                  control={form.control}
                  name="items"
                  render={({ field }) => {
                    return (
                      <FormItem
                        key={item.id}
                        className="flex flex-row items-start space-x-3 space-y-0"
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.id)}
                            onCheckedChange={(checked) => {
                              const currentValue = field.value || [];
                              if (checked) {
                                field.onChange([...currentValue, item.id]);
                              } else {
                                field.onChange(currentValue.filter((value) => value !== item.id));
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {item.label}
                        </FormLabel>
                      </FormItem>
                    )
                  }}
                />
              ))}
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Update display</Button>
      </form>
    </Form>
  )
}
