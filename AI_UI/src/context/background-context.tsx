"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";

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
  // Always start with "flicker" on both server and client to avoid hydration mismatch
  const [background, setBackgroundState] = useState<BackgroundOption>("flicker");

  // Track if initial load from localStorage is complete
  const hasLoadedFromStorage = useRef(false);
  // Store the localStorage value for comparison during DB sync
  const initialLocalStorageValue = useRef<string | null>(null);

  // Load from localStorage first (runs once after hydration)
  useEffect(() => {
    if (hasLoadedFromStorage.current) return;
    hasLoadedFromStorage.current = true;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      initialLocalStorageValue.current = saved;

      // Migrate old values
      if (saved === "solid-light" || saved === "solid-dark") {
        setBackgroundState("solid");
        localStorage.setItem(STORAGE_KEY, "solid");
        initialLocalStorageValue.current = "solid";
      } else if (saved && VALID_BACKGROUNDS.includes(saved as BackgroundOption)) {
        setBackgroundState(saved as BackgroundOption);
      }
    } catch { }
  }, []);

  // Then sync with database for logged-in users (runs after localStorage load)
  useEffect(() => {
    // Wait for localStorage to be loaded first
    if (!hasLoadedFromStorage.current) return;

    const syncWithDatabase = async () => {
      const email = getUserEmail();
      if (!email) return;

      try {
        const response = await fetch(`/api/settings?email=${encodeURIComponent(email)}`);
        if (response.ok) {
          const { settings } = await response.json();
          if (settings?.background && VALID_BACKGROUNDS.includes(settings.background)) {
            // Only update from DB if:
            // 1. DB has a non-default value, OR
            // 2. localStorage doesn't have a saved value (new session/device)
            const localValue = initialLocalStorageValue.current;
            const isLocalValueValid = localValue && VALID_BACKGROUNDS.includes(localValue as BackgroundOption);

            // If localStorage has a valid value but DB has default, trust localStorage
            // If localStorage is empty/invalid, use DB value
            // If DB has non-default value, use DB (it's the source of truth)
            if (!isLocalValueValid || settings.background !== "flicker") {
              setBackgroundState(settings.background as BackgroundOption);
              localStorage.setItem(STORAGE_KEY, settings.background);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load background from database:", e);
      }
    };

    // Small delay to ensure localStorage effect has run
    const timer = setTimeout(syncWithDatabase, 100);
    return () => clearTimeout(timer);
  }, []);

  // Save to database when background changes (with debounce)
  const saveToDatabase = useCallback(async (bg: BackgroundOption) => {
    const email = getUserEmail();
    if (!email) return;

    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          background: bg,
        }),
      });
    } catch (e) {
      console.error("Failed to save background to database:", e);
    }
  }, []);

  // Debounce ref for database saves
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Combined setter that updates state, localStorage, AND database
  const setBackground = useCallback((bg: BackgroundOption) => {
    setBackgroundState(bg);

    // Save to localStorage immediately
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, bg);
      }
    } catch { }

    // Debounce database save by 300ms to avoid excessive API calls
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveToDatabase(bg);
    }, 300);
  }, [saveToDatabase]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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
    [background, setBackground, options],
  );

  return <BackgroundContext.Provider value={value}>{children}</BackgroundContext.Provider>;
}

export function useBackground() {
  const ctx = useContext(BackgroundContext);
  if (!ctx) throw new Error("useBackground must be used within a BackgroundProvider");
  return ctx;
}