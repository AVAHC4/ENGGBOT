"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  generateTransitionCSS,
  type TransitionVariant,
  type StartPosition,
} from "@/lib/theme-animations";

// ─── Style‑injection helpers ────────────────────────────────────────────────

const STYLE_ID = "theme-transition-styles";

/**
 * Creates or updates a `<style>` tag in `<head>` that holds the
 * View-Transition override CSS.  Returns the element so the caller
 * can remove it later.
 */
function updateStyles(css: string): HTMLStyleElement {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
  return el;
}

function removeStyles(): void {
  document.getElementById(STYLE_ID)?.remove();
}

// ─── Component ──────────────────────────────────────────────────────────────

export interface ThemeSwitchProps {
  /** Animation variant. Defaults to `"circle"`. */
  variant?: TransitionVariant;
  /** Corner from which the reveal starts. Defaults to `"top-right"`. */
  start?: StartPosition;
  /** Extra class names forwarded to the underlying `<Button>`. */
  className?: string;
}

export function ThemeSwitch({
  variant = "circle",
  start = "top-right",
  className,
}: ThemeSwitchProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const handleClick = React.useCallback(() => {
    const currentTheme = resolvedTheme ?? theme ?? "light";
    const nextTheme = currentTheme === "light" ? "dark" : "light";

    // Generate the CSS for the chosen variant and inject it
    const css = generateTransitionCSS(variant, start);
    updateStyles(css);

    /**
     * The actual theme‑switching callback.
     * `document.startViewTransition` takes a snapshot of the old DOM,
     * runs this callback (which mutates the theme class),
     * then animates from the old snapshot to the new DOM.
     */
    const switchTheme = () => setTheme(nextTheme);

    // Feature-detect the View Transitions API
    if (
      typeof document !== "undefined" &&
      "startViewTransition" in document &&
      typeof (document as any).startViewTransition === "function"
    ) {
      const transition = (document as any).startViewTransition(switchTheme);

      // Clean up the injected <style> once the animation settles
      transition.finished.finally(() => {
        removeStyles();
      });
    } else {
      // Fallback: just switch immediately, no animation
      switchTheme();
      removeStyles();
    }
  }, [theme, resolvedTheme, setTheme, variant, start]);

  // Avoid hydration mismatch — render nothing until mounted
  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        className={`rounded-full ${className ?? ""}`}
        aria-label="Toggle theme"
        disabled
      >
        <span className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      id="theme-switch-toggle"
      variant="outline"
      size="icon"
      className={`rounded-full relative overflow-hidden ${className ?? ""}`}
      onClick={handleClick}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <Sun
        className={`h-[1.2rem] w-[1.2rem] transition-all duration-300 ${
          isDark
            ? "rotate-90 scale-0 opacity-0 absolute"
            : "rotate-0 scale-100 opacity-100"
        }`}
      />
      <Moon
        className={`h-[1.2rem] w-[1.2rem] transition-all duration-300 ${
          isDark
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0 absolute"
        }`}
      />
    </Button>
  );
}
