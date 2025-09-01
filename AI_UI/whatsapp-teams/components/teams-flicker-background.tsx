"use client";

import { useTheme } from "next-themes";
import { FlickeringGrid } from "../../src/components/ui/flickering-grid";

type Props = {
  className?: string;
};

export function TeamsFlickerBackground({ className }: Props) {
  const { resolvedTheme } = useTheme();

  // Dark theme: subtle light squares; Light theme: subtle dark squares
  const color = resolvedTheme === "light" ? "#000000" : "#CCCCCC";

  return (
    <FlickeringGrid
      color={color}
      maxOpacity={0.2}
      className={className}
    />
  );
}
