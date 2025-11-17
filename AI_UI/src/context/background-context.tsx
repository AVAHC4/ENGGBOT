"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type BackgroundOption =
  | "flicker"
  | "solid-dark"
  | "solid-light"
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
      const saved = (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) as BackgroundOption | null;
      if (saved) setBackgroundState(saved);
    } catch {}
  }, []);

  // Persist changes
  useEffect(() => {
    try {
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, background);
    } catch {}
  }, [background]);

  const setBackground = (bg: BackgroundOption) => setBackgroundState(bg);

  const options = useMemo(
    () => [
      { value: "flicker" as const, label: "Flickering Grid" },
      { value: "radial-vignette" as const, label: "Radial Vignette" },
      { value: "sunset-gradient" as const, label: "Sunset Gradient" },
      { value: "solid-light" as const, label: "Solid Light" },
      { value: "solid-dark" as const, label: "Solid Dark" },
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
