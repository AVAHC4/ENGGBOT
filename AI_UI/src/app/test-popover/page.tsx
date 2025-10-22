"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export default function TestPopoverPage() {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-8">
      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-white">Popover Test</h1>
        
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-8">
          <p className="mb-4 text-white">Open state: {open ? "OPEN" : "CLOSED"}</p>
          
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-[200px]"
                onClick={() => console.log("Button clicked, open state:", open)}
              >
                Click me! {open ? "🟢" : "🔴"}
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-[300px] bg-red-500 p-8 text-white" 
              sideOffset={10}
            >
              <div className="space-y-4">
                <h2 className="text-xl font-bold">🎉 POPOVER WORKS!</h2>
                <p>This is a bright red popover to test visibility.</p>
                <Button onClick={() => setOpen(false)}>Close</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2 text-sm text-zinc-400">
          <p>1. Click the button</p>
          <p>2. A bright RED popover should appear</p>
          <p>3. Check console for click events</p>
        </div>
      </div>
    </div>
  )
}
