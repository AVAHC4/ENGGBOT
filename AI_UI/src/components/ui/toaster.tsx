"use client"

import { Toaster as SonnerToaster } from "sonner"

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      toastOptions={{
        className: "border-border",
        style: {
          background: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
          border: "1px solid hsl(var(--border))",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          opacity: "1",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
        },
      }}
      closeButton
    />
  )
} 