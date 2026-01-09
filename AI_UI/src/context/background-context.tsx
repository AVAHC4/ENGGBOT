"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type BackgroundOption =
  | "flicker"
  | "solid"
  | "radial-vignette"
  | "sunset-gradient";

interface BackgroundContextValue {
  background: BackgroundOption;
  setBackground: (bg: BackgroundOption) => void;
  options: { value: BackgroundOption; label: string }[];
}

const STORAGE_KEY = "ui-background";
const VALID_BACKGROUNDS: BackgroundOption[] = ["flicker", "solid", "radial-vignette", "sunset-gradient"];

// Helper function to get user email from localStorage
function getUserEmail(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      const parsed = JSON.parse(userData);
      return parsed.email || null;
    }
    return localStorage.getItem('user_email') || null;
  } catch {
    return null;
  }
}

const BackgroundContext = createContext<BackgroundContextValue | undefined>(undefined);

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  // Default to "flicker" (black dotted grid) for new users
  const [background, setBackgroundState] = useState<BackgroundOption>("flicker");

  // Load persisted value from localStorage first, then sync with database
  useEffect(() => {
    const loadBackground = async () => {
      try {
        // First, load from localStorage for immediate display
        const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        // Migrate old values to new 'solid' option
        if (saved === "solid-light" || saved === "solid-dark") {
          setBackgroundState("solid");
          localStorage.setItem(STORAGE_KEY, "solid");
        } else if (saved && VALID_BACKGROUNDS.includes(saved as BackgroundOption)) {
          setBackgroundState(saved as BackgroundOption);
        }
        // If no saved value, keep default "flicker" (black dotted)

        // Then, try to load from database for logged-in users
        const email = getUserEmail();
        if (email) {
          try {
            const response = await fetch(`/api/settings?email=${encodeURIComponent(email)}`);
            if (response.ok) {
              const { settings } = await response.json();
              if (settings?.background && VALID_BACKGROUNDS.includes(settings.background)) {
                // Only update if database has a saved value (not the default)
                // This ensures user's explicit choice from settings is respected
                setBackgroundState(settings.background as BackgroundOption);
                localStorage.setItem(STORAGE_KEY, settings.background);
              }
            }
          } catch (e) {
            // Silently fail - use localStorage value or default
            console.error("Failed to load background from database:", e);
          }
        }
      } catch { }
    };

    loadBackground();
  }, []);

  // Persist changes
  useEffect(() => {
    try {
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, background);
    } catch { }
  }, [background]);

  const setBackground = (bg: BackgroundOption) => setBackgroundState(bg);

  const options = useMemo(
    () => [
      { value: "flicker" as const, label: "Flickering Grid" },
      { value: "radial-vignette" as const, label: "Radial Vignette" },
      { value: "sunset-gradient" as const, label: "Sunset Gradient" },
      { value: "solid" as const, label: "Solid" },
    ],
    [],
  );

  const value: BackgroundContextValue = useMemo(
    () => ({ background, setBackground, options }),
    [background, options],
  );

  return <BackgroundContext.Provider value={value}>{children}</BackgroundContext.Provider>;
}

export function useBackground() {
  const ctx = useContext(BackgroundContext);
  if (!ctx) throw new Error("useBackground must be used within a BackgroundProvider");
  return ctx;
}
