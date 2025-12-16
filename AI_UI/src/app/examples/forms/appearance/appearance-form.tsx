"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronDown } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTheme } from "next-themes"
import { z } from "zod"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { useBackground } from "@/context/background-context"
import { ProfileCard } from "@/components/ui/profile-card"
import { compressImage } from "@/lib/image-utils"

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

const appearanceFormSchema = z.object({
  theme: z.enum(["light", "dark"], {
    required_error: "Please select a theme.",
  }),
  font: z.enum(["inter", "manrope", "system"], {
    invalid_type_error: "Select a font",
    required_error: "Please select a font.",
  }),
  background: z.enum([
    "flicker",
    "radial-vignette",
    "sunset-gradient",
    "solid-light",
    "solid-dark",
  ] as const),
})

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>



export function AppearanceForm() {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const [isMounted, setIsMounted] = React.useState(false);
  const { background, setBackground, options } = useBackground()
  const [profileImage, setProfileImage] = React.useState<string>("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false)
  const [pendingData, setPendingData] = React.useState<AppearanceFormValues | null>(null)

  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
      theme: "light", // Default to light on server
      font: "inter",
      background: "flicker",
    },
  })

  // When the component mounts, update the form with the actual theme.
  React.useEffect(() => {
    const loadData = async () => {
      if (theme) {
        form.setValue("theme", theme as "light" | "dark");
      }
      if (background) {
        form.setValue("background", background as AppearanceFormValues["background"])
      }

      // Load profile image from localStorage first (for immediate display)
      const savedAvatar = localStorage.getItem('user_avatar');
      if (savedAvatar) {
        setProfileImage(savedAvatar);
      } else {
        try {
          const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
          if (userData.avatar) {
            setProfileImage(userData.avatar);
          }
        } catch (e) {
          console.error("Error parsing user data", e);
        }
      }

      // Try to load from database
      const email = getUserEmail()
      if (email) {
        try {
          const response = await fetch(`/api/settings?email=${encodeURIComponent(email)}`)
          if (response.ok) {
            const { settings } = await response.json()
            if (settings) {
              if (settings.theme) form.setValue("theme", settings.theme)
              if (settings.font) form.setValue("font", settings.font)
              if (settings.background) form.setValue("background", settings.background)
              if (settings.avatar) setProfileImage(settings.avatar)
            }
          }
        } catch (e) {
          console.error("Failed to load appearance settings from database:", e)
        }
      }

      setIsMounted(true);
    }

    loadData()
  }, [theme, background, form]);


  // Prevent rendering the form until the component is mounted on the client
  if (!isMounted) {
    return null;
  }

  async function onConfirmSave(data: AppearanceFormValues) {
    setOpen(false)
    setTheme(data.theme)
    setBackground(data.background)

    // Save profile image to localStorage for immediate updates
    if (profileImage) {
      localStorage.setItem('user_avatar', profileImage);

      try {
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
        userData.avatar = profileImage;
        localStorage.setItem('user_data', JSON.stringify(userData));
      } catch (e) {
        console.error("Error updating user data", e);
      }

      window.dispatchEvent(new StorageEvent('storage', { key: 'user_avatar' }));
    }

    // Save to database
    const email = getUserEmail()
    if (email) {
      try {
        const response = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            theme: data.theme,
            font: data.font,
            background: data.background,
            avatar: profileImage || null,
          }),
        })

        if (!response.ok) {
          console.error('Failed to save appearance settings to database')
        }
      } catch (e) {
        console.error('Error saving appearance settings:', e)
      }
    }

    toast({
      title: "Preferences updated!",
      description: "Your theme, font, background, and profile picture have been saved.",
    })
  }


  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file);
        setProfileImage(compressedBase64);
      } catch (error) {
        console.error("Error compressing image:", error);
        toast({
          title: "Error",
          description: "Failed to process image. Please try another one.",
          variant: "destructive",
        });
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  function onSubmit(data: AppearanceFormValues) {
    setPendingData(data)
    setOpen(true)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="font"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Font</FormLabel>
              <div className="relative w-max">
                <FormControl>
                  <select
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "w-[200px] appearance-none font-normal"
                    )}
                    {...field}
                  >
                    <option value="inter">Inter</option>
                    <option value="manrope">Manrope</option>
                    <option value="system">System</option>
                  </select>
                </FormControl>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 opacity-50" />
              </div>
              <FormDescription>
                Set the font you want to use in the dashboard.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="theme"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel>Theme</FormLabel>
              <FormDescription>
                Select the theme for the dashboard.
              </FormDescription>
              <FormMessage />
              <RadioGroup
                onValueChange={(value: "light" | "dark") => {
                  field.onChange(value)
                  setTheme(value)
                }}
                defaultValue={field.value}
                className="grid max-w-md grid-cols-2 gap-8 pt-2"
              >
                <FormItem>
                  <FormLabel className="[&:has([data-state=checked])>div]:border-primary">
                    <FormControl>
                      <RadioGroupItem value="light" className="sr-only" />
                    </FormControl>
                    <div className="items-center rounded-md border-2 border-muted p-1 hover:border-accent">
                      <div className="space-y-2 rounded-sm bg-[#ecedef] p-2">
                        <div className="space-y-2 rounded-md bg-white p-2 shadow-sm">
                          <div className="h-2 w-[80px] rounded-lg bg-[#ecedef]" />
                          <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                        </div>
                        <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                          <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                          <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                        </div>
                        <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                          <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                          <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                        </div>
                      </div>
                    </div>
                    <span className="block w-full p-2 text-center font-normal">
                      Light
                    </span>
                  </FormLabel>
                </FormItem>
                <FormItem>
                  <FormLabel className="[&:has([data-state=checked])>div]:border-primary">
                    <FormControl>
                      <RadioGroupItem value="dark" className="sr-only" />
                    </FormControl>
                    <div className="items-center rounded-md border-2 border-muted bg-popover p-1 hover:bg-accent hover:text-accent-foreground">
                      <div className="space-y-2 rounded-sm bg-slate-950 p-2">
                        <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
                          <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                          <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                        </div>
                        <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                          <div className="h-4 w-4 rounded-full bg-slate-400" />
                          <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                        </div>
                        <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                          <div className="h-4 w-4 rounded-full bg-slate-400" />
                          <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                        </div>
                      </div>
                    </div>
                    <span className="block w-full p-2 text-center font-normal">
                      Dark
                    </span>
                  </FormLabel>
                </FormItem>
              </RadioGroup>
            </FormItem>
          )}
        />

        {/* Backgrounds */}
        <FormField
          control={form.control}
          name="background"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel>Backgrounds</FormLabel>
              <FormDescription>
                Choose the background style for the entire app.
              </FormDescription>
              <FormMessage />
              <RadioGroup
                onValueChange={(value) => {
                  field.onChange(value)
                  setBackground(value as typeof field.value)
                }}
                defaultValue={field.value}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2"
              >
                {/* Flickering Grid */}
                <FormItem className="w-full">
                  <FormLabel className="w-full cursor-pointer [&:has([data-state=checked])>div]:border-primary">
                    <FormControl>
                      <RadioGroupItem value="flicker" className="sr-only" />
                    </FormControl>
                    <div className="w-full rounded-md border-2 border-muted p-2 hover:border-accent transition-colors">
                      <div className="h-24 w-full rounded-sm bg-slate-900 bg-[radial-gradient(circle_at_1px_1px,#444_1px,transparent_1px)] [background-size:8px_8px] dark:bg-slate-800 dark:bg-[radial-gradient(circle_at_1px_1px,#666_1px,transparent_1px)]" />
                    </div>
                    <span className="block w-full p-2 text-center font-normal">Flickering Grid</span>
                  </FormLabel>
                </FormItem>

                {/* Radial Vignette */}
                <FormItem className="w-full">
                  <FormLabel className="w-full cursor-pointer [&:has([data-state=checked])>div]:border-primary">
                    <FormControl>
                      <RadioGroupItem value="radial-vignette" className="sr-only" />
                    </FormControl>
                    <div className="w-full rounded-md border-2 border-muted p-2 hover:border-accent transition-colors">
                      <div className="h-24 w-full rounded-sm bg-slate-800 bg-[radial-gradient(60%_50%_at_50%_30%,rgba(255,255,255,0.15),rgba(0,0,0,0))]" />
                    </div>
                    <span className="block w-full p-2 text-center font-normal">Radial Vignette</span>
                  </FormLabel>
                </FormItem>

                {/* Sunset Gradient */}
                <FormItem className="w-full">
                  <FormLabel className="w-full cursor-pointer [&:has([data-state=checked])>div]:border-primary">
                    <FormControl>
                      <RadioGroupItem value="sunset-gradient" className="sr-only" />
                    </FormControl>
                    <div className="w-full rounded-md border-2 border-muted p-2 hover:border-accent transition-colors">
                      <div className="h-24 w-full rounded-sm bg-[linear-gradient(135deg,#ff9a9e_0%,#fad0c4_55%,#fbc2eb_100%)] dark:bg-[linear-gradient(135deg,#0f0c29_0%,#302b63_50%,#24243e_100%)]" />
                    </div>
                    <span className="block w-full p-2 text-center font-normal">Sunset Gradient</span>
                  </FormLabel>
                </FormItem>

                {/* Solid Light */}
                <FormItem className="w-full">
                  <FormLabel className="w-full cursor-pointer [&:has([data-state=checked])>div]:border-primary">
                    <FormControl>
                      <RadioGroupItem value="solid-light" className="sr-only" />
                    </FormControl>
                    <div className="w-full rounded-md border-2 border-muted p-2 hover:border-accent transition-colors">
                      <div className="h-24 w-full rounded-sm bg-white border border-slate-200" />
                    </div>
                    <span className="block w-full p-2 text-center font-normal">Solid Light</span>
                  </FormLabel>
                </FormItem>

                {/* Solid Dark */}
                <FormItem className="w-full">
                  <FormLabel className="w-full cursor-pointer [&:has([data-state=checked])>div]:border-primary">
                    <FormControl>
                      <RadioGroupItem value="solid-dark" className="sr-only" />
                    </FormControl>
                    <div className="w-full rounded-md border-2 border-muted p-2 hover:border-accent transition-colors">
                      <div className="h-24 w-full rounded-sm bg-black" />
                    </div>
                    <span className="block w-full p-2 text-center font-normal">Solid Dark</span>
                  </FormLabel>
                </FormItem>
              </RadioGroup>
            </FormItem>
          )}
        />

        <div className="space-y-1">
          <FormLabel>Profile Picture</FormLabel>
          <FormDescription>
            This is how others will see you on the site.
          </FormDescription>
          <div className="pt-2 space-y-4">
            <ProfileCard showAddMember={false} imageSrc={profileImage || undefined} />

            <div className="flex items-center gap-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={triggerFileInput}
              >
                Change Profile Picture
              </Button>
            </div>
          </div>
        </div>

        <Button type="submit">Update preferences</Button>
      </form>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will update your appearance settings.
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
