"use client";

import React from "react";
import { useBackground } from "@/context/background-context";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { useTheme } from "next-themes";

export function BackgroundRenderer() {
  const { background } = useBackground();
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  // Ensure text remains visible when using a light (white) background while theme is dark.
  React.useEffect(() => {
    const cls = "bg-solid-light-text";
    const root = typeof document !== "undefined" ? document.documentElement : null;
    if (!root) return;
    if (background === "solid-light") {
      root.classList.add(cls);
    } else {
      root.classList.remove(cls);
    }
    return () => {
      root.classList.remove(cls);
    };
  }, [background]);

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden>
      {background === "flicker" && (
        <FlickeringGrid
          color={isDark ? "#CCCCCC" : "#000000"}
          maxOpacity={0.2}
          className="absolute inset-0"
        />
      )}

      {background === "solid-dark" && (
        <div className="absolute inset-0 bg-black" />
      )}

      {background === "solid-light" && (
        <div className="absolute inset-0 bg-white" />
      )}

      {background === "radial-vignette" && (
        <div
          className="absolute inset-0"
          style={{
            background:
              isDark
                ? "radial-gradient(800px 600px at 50% 30%, rgba(255,255,255,0.08), rgba(0,0,0,0.9))"
                : "radial-gradient(800px 600px at 50% 30%, rgba(0,0,0,0.05), rgba(255,255,255,1))",
          }}
        />
      )}

      {background === "sunset-gradient" && (
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)"
              : "linear-gradient(135deg, #ff9a9e 0%, #fad0c4 55%, #fbc2eb 100%)",
          }}
        />
      )}
    </div>
  );
}
