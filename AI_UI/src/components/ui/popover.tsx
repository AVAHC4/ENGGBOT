"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

cnst Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
    showArrow?: boolean;
  }
>(({ className, align = "center", sideOffset = 4, showArrow = false, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-[9999] min-w-[8rem] rounded-lg border-4 border-red-500 bg-zinc-800 p-4 text-white shadow-[0_0_50px_rgba(255,0,0,0.5)] outline-none [&[data-state=open]]:block",
        className,
      )}
      {...props}
    >
      <div className="bg-red-500 p-2 text-white font-bold mb-2">POPOVER IS HERE!</div>
      {props.children}
      {showArrow && (
        <PopoverPrimitive.Arrow className="-my-px fill-popover drop-shadow-[0_1px_0_hsl(var(--border))]" />
      )}
    </PopoverPrimitive.Content>
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger }
