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

// Get initial background from localStorage synchronously during state init
function getInitialBackground(): BackgroundOption {
  if (typeof window === 'undefined') return "flicker";

  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    // Migrate old values
    if (saved === "solid-light" || saved === "solid-dark") {
      localStorage.setItem(STORAGE_KEY, "solid");
      return "solid";
    }

    if (saved && VALID_BACKGROUNDS.includes(saved as BackgroundOption)) {
      return saved as BackgroundOption;
    }
  } catch { }

  // Default for new users: "flicker" (black dotted grid)
  return "flicker";
}

const BackgroundContext = createContext<BackgroundContextValue | undefined>(undefined);

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  // Initialize with localStorage value synchronously to prevent flashing
  const [background, setBackgroundState] = useState<BackgroundOption>(getInitialBackground);

  // Track if initial mount is complete
  const isInitialMount = useRef(true);
  // Track if DB has been checked
  const dbChecked = useRef(false);
  // Store the localStorage value at initial load for comparison (as a ref to persist value)
  const initialLocalStorageValue = useRef<string | null>(null);

  // Sync with database for logged-in users (runs once after mount)
  useEffect(() => {
    // Capture the initial localStorage value before any DB sync
    initialLocalStorageValue.current = typeof window !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY)
      : null;

    const syncWithDatabase = async () => {
      const email = getUserEmail();
      if (!email) {
        // No logged in user, just mark as loaded
        dbChecked.current = true;
        isInitialMount.current = false;
        return;
      }

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

            // If localStorage has a valid value but DB is different, trust localStorage
            // (user may have changed it and DB hasn't synced yet)
            // If localStorage is empty/invalid, use DB value
            if (!isLocalValueValid || settings.background !== "flicker") {
              setBackgroundState(settings.background as BackgroundOption);
              localStorage.setItem(STORAGE_KEY, settings.background);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load background from database:", e);
      }

      dbChecked.current = true;
      isInitialMount.current = false;
    };

    syncWithDatabase();
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