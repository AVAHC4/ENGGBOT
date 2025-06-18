"use client"

import { Toaster as SonnerToaster } from "sonner"

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        className: "border-border",
        style: {
          background: "#111111",
          color: "white",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
          opacity: "1",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
        },
        duration: 4000,
      }}
      closeButton
      theme="dark"
    />
  )
} 