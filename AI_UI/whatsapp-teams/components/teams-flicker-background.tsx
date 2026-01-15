"use client";

import { useTheme } from "next-themes";
import { FlickeringGrid } from "../../src/components/ui/flickering-grid";

type Props = {
  className?: string;
};

export function TeamsFlickerBackground({ className }: Props) {
  const { resolvedTheme } = useTheme();

   
  const color = resolvedTheme === "light" ? "#000000" : "#FFFFFF";

  return (
    <FlickeringGrid
      color={color}
      maxOpacity={0.3}
      className={className}
    />
  );
}
