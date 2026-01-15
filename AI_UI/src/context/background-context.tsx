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
   
  const [background, setBackgroundState] = useState<BackgroundOption>("flicker");

   
  const hasLoadedFromStorage = useRef(false);
   
  const initialLocalStorageValue = useRef<string | null>(null);

   
  useEffect(() => {
    if (hasLoadedFromStorage.current) return;
    hasLoadedFromStorage.current = true;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      initialLocalStorageValue.current = saved;

       
      if (saved === "solid-light" || saved === "solid-dark") {
        setBackgroundState("solid");
        localStorage.setItem(STORAGE_KEY, "solid");
        initialLocalStorageValue.current = "solid";
      } else if (saved && VALID_BACKGROUNDS.includes(saved as BackgroundOption)) {
        setBackgroundState(saved as BackgroundOption);
      }
    } catch { }
  }, []);

   
  useEffect(() => {
     
    if (!hasLoadedFromStorage.current) return;

    const syncWithDatabase = async () => {
      const email = getUserEmail();
      if (!email) return;

      try {
        const response = await fetch(`/api/settings?email=${encodeURIComponent(email)}`);
        if (response.ok) {
          const { settings } = await response.json();
          if (settings?.background && VALID_BACKGROUNDS.includes(settings.background)) {
             
             
             
            const localValue = initialLocalStorageValue.current;
            const isLocalValueValid = localValue && VALID_BACKGROUNDS.includes(localValue as BackgroundOption);

             
             
             
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

     
    const timer = setTimeout(syncWithDatabase, 100);
    return () => clearTimeout(timer);
  }, []);

   
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

   
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

   
  const setBackground = useCallback((bg: BackgroundOption) => {
    setBackgroundState(bg);

     
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, bg);
      }
    } catch { }

     
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveToDatabase(bg);
    }, 300);
  }, [saveToDatabase]);

   
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