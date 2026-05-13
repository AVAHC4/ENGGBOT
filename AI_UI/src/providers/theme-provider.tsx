"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      /* disableTransitionOnChange — removed to allow View Transition animations */
      enableColorScheme
       
      storageKey="ui-theme"
       
      forcedTheme={typeof window === "undefined" ? "system" : undefined}
    >
      {children}
    </NextThemesProvider>
  );
} 