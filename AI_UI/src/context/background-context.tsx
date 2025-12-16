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

const BackgroundContext = createContext<BackgroundContextValue | undefined>(undefined);

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const [background, setBackgroundState] = useState<BackgroundOption>("flicker");

  // Load persisted value
  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      // Migrate old values to new 'solid' option
      if (saved === "solid-light" || saved === "solid-dark") {
        setBackgroundState("solid");
        localStorage.setItem(STORAGE_KEY, "solid");
      } else if (saved && ["flicker", "solid", "radial-vignette", "sunset-gradient"].includes(saved)) {
        setBackgroundState(saved as BackgroundOption);
      }
    } catch { }
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
