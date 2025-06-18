"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
      // Suppress hydration warnings from next-themes
      storageKey="ui-theme"
      // Force identical server/client output until hydrated
      forcedTheme={typeof window === "undefined" ? "system" : undefined}
    >
      {children}
    </NextThemesProvider>
  );
} 