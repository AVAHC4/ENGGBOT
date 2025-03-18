import { cn } from "@/lib/utils"
import React from "react"

export const Logo = ({ className }: { className?: string }) => {
  return (
    <svg className={cn("size-7 w-7", className)} viewBox="0 0 48 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 4L4 12L12 20M36 4L44 12L36 20"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}