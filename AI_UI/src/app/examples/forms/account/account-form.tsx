"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { CalendarIcon, Check, ChevronsUpDown, ChevronDownIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useToast } from "@/hooks/use-toast"
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

const languages = [
  { label: "English", value: "en" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Spanish", value: "es" },
  { label: "Portuguese", value: "pt" },
  { label: "Russian", value: "ru" },
  { label: "Japanese", value: "ja" },
  { label: "Korean", value: "ko" },
  { label: "Chinese", value: "zh" },
] as const

const accountFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .max(30, {
      message: "Name must not be longer than 30 characters.",
    }),
  dob: z.date({
    required_error: "A date of birth is required.",
  }),
  language: z.string({
    required_error: "Please select a language.",
  }),
})

type AccountFormValues = z.infer<typeof accountFormSchema>

// This can come from your database or API.
const defaultValues: Partial<AccountFormValues> = {
  // name: "Your name",
  // dob: new Date("2023-01-23"),
}

import { supabase } from "@/lib/supabase"
import { useLanguage } from "@/context/language-context"

export function AccountForm() {
  const { toast } = useToast()
  const [dobPopoverOpen, setDobPopoverOpen] = React.useState(false)
  const [languagePopoverOpen, setLanguagePopoverOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [open, setOpen] = React.useState(false)
  const [pendingData, setPendingData] = React.useState<AccountFormValues | null>(null)
  const { setLanguage } = useLanguage()
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues,
  })

  // Load user data on mount (from DB or localStorage)
  React.useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // 1. Try to get data from Supabase if authenticated
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name, dob, language')
            .eq('id', user.id)
            .single()

          if (profile && !error) {
            if (profile.full_name) form.setValue("name", profile.full_name)
            if (profile.dob) form.setValue("dob", new Date(profile.dob))
            if (profile.language) {
              form.setValue("language", profile.language)
              // Also set app language immediately if it differs
              // setLanguage(profile.language as any) // Optional: sync on load? Maybe better not to force it on load to avoid jarring changes if local pref differs
            }
            setIsLoading(false)
            return
          }
        }

        // 2. Fallback to localStorage if no user or DB error
        const savedData = localStorage.getItem("user_data")
        if (savedData) {
          const parsed = JSON.parse(savedData)
          if (parsed.name) form.setValue("name", parsed.name)
          if (parsed.dob) form.setValue("dob", new Date(parsed.dob))
          if (parsed.language) form.setValue("language", parsed.language)
        }
      } catch (e) {
        console.error("Failed to load user data", e)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [form])

  async function onConfirmSave(data: AccountFormValues) {
    setOpen(false)
    try {
      // Update app language immediately
      setLanguage(data.language as any)

      // 1. Save to Supabase if authenticated
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            full_name: data.name,
            dob: data.dob.toISOString(),
            language: data.language,
            updated_at: new Date().toISOString(),
          })

        if (error) {
          console.error("Error saving to Supabase:", error)
          toast({
            title: "Error saving online",
            description: "Could not save to database, but saved locally.",
            variant: "destructive",
          })
        }
      }

      // 2. Always save to localStorage for offline access/sidebar sync
      const savedData = localStorage.getItem("user_data")
      let currentData = {}
      try {
        currentData = savedData ? JSON.parse(savedData) : {}
      } catch (e) {
        // Ignore error
      }

      const newData = {
        ...currentData,
        name: data.name,
        dob: data.dob.toISOString(),
        language: data.language,
      }

      localStorage.setItem("user_data", JSON.stringify(newData))
      localStorage.setItem("user_name", data.name)

      // Dispatch storage event
      window.dispatchEvent(new Event("storage"))

      toast({
        title: "Account updated",
        description: "Your account settings have been saved.",
      })
    } catch (e) {
      console.error("Error in onSubmit:", e)
      toast({
        title: "Error",
        description: "Something went wrong while saving.",
        variant: "destructive",
      })
    }
  }

  function onSubmit(data: AccountFormValues) {
    setPendingData(data)
    setOpen(true)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormDescription>
                This is the name that will be displayed on your profile and in
                emails.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dob"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of birth</FormLabel>
              <Popover open={dobPopoverOpen} onOpenChange={setDobPopoverOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[240px] justify-between font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value ? (
                      format(field.value, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <ChevronDownIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                      console.log("Date selected:", date)
                      field.onChange(date)
                      setDobPopoverOpen(false)
                    }}
                    captionLayout="dropdown"
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                Your date of birth is used to calculate your age.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Language</FormLabel>
              <Popover open={languagePopoverOpen} onOpenChange={setLanguagePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-[200px] justify-between",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value
                      ? languages.find(
                        (language) => language.value === field.value
                      )?.label
                      : "Select language"}
                    <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Search language..." />
                    <CommandList>
                      <CommandEmpty>No language found.</CommandEmpty>
                      <CommandGroup>
                        {languages.map((language) => (
                          <CommandItem
                            value={language.label}
                            key={language.value}
                            onSelect={() => {
                              form.setValue("language", language.value)
                              setLanguagePopoverOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                language.value === field.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {language.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>
                This is the language that will be used in the dashboard.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Update account</Button>
      </form>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will update your account settings.
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
