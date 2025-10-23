"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export default function TestCalendarPage() {
  const [date, setDate] = useState<Date>()

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Calendar Test Page</h1>
          <p className="text-muted-foreground">
            Click the button below to open the calendar
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Date of birth</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-auto p-0 bg-white dark:bg-gray-900 border-2 border-blue-500 shadow-2xl" 
                align="start"
              >
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-sm text-muted-foreground">
              Your date of birth is used to calculate your age.
            </p>
          </div>

          {date && (
            <div className="p-4 bg-green-100 dark:bg-green-900 rounded-md">
              <p className="text-sm font-medium">Selected Date:</p>
              <p className="text-lg">{format(date, "PPP")}</p>
            </div>
          )}

          <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-md">
            <h3 className="font-medium mb-2">Instructions:</h3>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>Click the button above to open the calendar</li>
              <li>Navigate months using the arrow buttons</li>
              <li>Click on any date to select it</li>
              <li>Future dates are disabled</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
