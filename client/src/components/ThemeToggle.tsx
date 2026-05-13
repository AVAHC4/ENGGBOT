import { Moon, Sun } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { generateTransitionCSS } from "../lib/theme-animations";

// ─── Style‑injection helpers ────────────────────────────────────────────────

const STYLE_ID = "theme-transition-styles";

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

export function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) {
        return savedTheme;
      }
      // If no theme is saved, check system preference
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
      return "dark"; // Default to dark if no preference
    }
    return "dark";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleClick = useCallback(() => {
    const nextTheme = theme === "light" ? "dark" : "light";

    // Generate the CSS for the circle variant and inject it
    const css = generateTransitionCSS("circle", "top-right");
    updateStyles(css);

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
  }, [theme]);

  return (
    <button
      onClick={handleClick}
      className="fixed top-4 right-4 p-2 rounded-full bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-300 z-50 relative overflow-hidden"
      aria-label="Toggle theme"
    >
      <Sun 
        className={`h-5 w-5 text-yellow-500 transition-all duration-300 ${
          theme === "dark"
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0 absolute"
        }`} 
      />
      <Moon 
        className={`h-5 w-5 text-gray-700 transition-all duration-300 ${
          theme === "dark"
            ? "rotate-90 scale-0 opacity-0 absolute"
            : "rotate-0 scale-100 opacity-100"
        }`} 
      />
    </button>
  );
}