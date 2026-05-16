"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";

export type FontOption = "inter" | "manrope" | "system" | "sohne" | "serif";

interface FontContextValue {
  font: FontOption;
  setFont: (font: FontOption) => void;
  options: { value: FontOption; label: string }[];
}

const STORAGE_KEY = "ui-font";
const VALID_FONTS: FontOption[] = ["inter", "manrope", "system", "sohne", "serif"];

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

const FontContext = createContext<FontContextValue | undefined>(undefined);

export function FontProvider({ children }: { children: React.ReactNode }) {
  const [font, setFontState] = useState<FontOption>("inter");

  const hasLoadedFromStorage = useRef(false);
  const initialLocalStorageValue = useRef<string | null>(null);

  useEffect(() => {
    if (hasLoadedFromStorage.current) return;
    hasLoadedFromStorage.current = true;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      initialLocalStorageValue.current = saved;

      if (saved && VALID_FONTS.includes(saved as FontOption)) {
        setFontState(saved as FontOption);
      }
    } catch {}
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
          if (settings?.font && VALID_FONTS.includes(settings.font)) {
            const localValue = initialLocalStorageValue.current;
            const isLocalValueValid = localValue && VALID_FONTS.includes(localValue as FontOption);

            if (!isLocalValueValid || settings.font !== "inter") {
              setFontState(settings.font as FontOption);
              localStorage.setItem(STORAGE_KEY, settings.font);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load font from database:", e);
      }
    };

    const timer = setTimeout(syncWithDatabase, 100);
    return () => clearTimeout(timer);
  }, []);

  // Update document classes based on the current font
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      
      // Remove any existing font- related classes
      const classesToRemove = Array.from(root.classList).filter(c => c.startsWith('font-') && ['inter', 'manrope', 'system', 'sohne', 'serif'].includes(c.replace('font-', '')));
      root.classList.remove(...classesToRemove);
      
      // Add the new font class
      root.classList.add(`font-${font}`);
    }
  }, [font]);

  const saveToDatabase = useCallback(async (f: FontOption) => {
    const email = getUserEmail();
    if (!email) return;

    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          font: f,
        }),
      });
    } catch (e) {
      console.error("Failed to save font to database:", e);
    }
  }, []);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setFont = useCallback((f: FontOption) => {
    setFontState(f);

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, f);
      }
    } catch {}

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveToDatabase(f);
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
      { value: "inter" as const, label: "Inter" },
      { value: "manrope" as const, label: "Manrope" },
      { value: "system" as const, label: "System" },
      { value: "sohne" as const, label: "Söhne" },
      { value: "serif" as const, label: "Serif" },
    ],
    [],
  );

  const value: FontContextValue = useMemo(
    () => ({ font, setFont, options }),
    [font, setFont, options],
  );

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
}

export function useFont() {
  const ctx = useContext(FontContext);
  if (!ctx) throw new Error("useFont must be used within a FontProvider");
  return ctx;
}
