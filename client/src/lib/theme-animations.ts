/**
 * Generates CSS strings for View Transition theme-switch animations.
 *
 * Supported variants:
 *   - "circle" : A circle-reveal that expands from one of the four corners.
 *
 * The generated rules override the default cross-fade behaviour of
 * `::view-transition-old(root)` / `::view-transition-new(root)`.
 */

export type TransitionVariant = "circle";
export type StartPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";

interface PositionConfig {

  cx: number;
  cy: number;
  /** CSS background-position for the mask */
  maskPosition: string;
  /** CSS transform-origin */
  transformOrigin: string;
  /** Unique keyframe name */
  keyframeName: string;
}

const POSITION_MAP: Record<StartPosition, PositionConfig> = {
  "top-right": {
    cx: 40,
    cy: 0,
    maskPosition: "top right",
    transformOrigin: "top right",
    keyframeName: "scale-top-right",
  },
  "top-left": {
    cx: 0,
    cy: 0,
    maskPosition: "top left",
    transformOrigin: "top left",
    keyframeName: "scale-top-left",
  },
  "bottom-right": {
    cx: 40,
    cy: 40,
    maskPosition: "bottom right",
    transformOrigin: "bottom right",
    keyframeName: "scale-bottom-right",
  },
  "bottom-left": {
    cx: 0,
    cy: 40,
    maskPosition: "bottom left",
    transformOrigin: "bottom left",
    keyframeName: "scale-bottom-left",
  },
};

function buildCircleSvgUri(cx: number, cy: number): string {
  return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="${cx}" cy="${cy}" r="20" fill="white"/></svg>`;
}


function generateCircleCSS(start: StartPosition): string {
  const pos = POSITION_MAP[start];
  const svgUri = buildCircleSvgUri(pos.cx, pos.cy);

  return `
::view-transition-group(root) {
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); /* expo-out */
}

::view-transition-new(root) {
  mask: url('${svgUri}') ${pos.maskPosition} / 0 no-repeat;
  mask-origin: content-box;
  animation: ${pos.keyframeName} 1s forwards;
  transform-origin: ${pos.transformOrigin};
}

::view-transition-old(root),
.dark::view-transition-old(root) {
  animation: ${pos.keyframeName} 1s forwards;
  transform-origin: ${pos.transformOrigin};
  z-index: -1;
}

@keyframes ${pos.keyframeName} {
  to {
    mask-size: 350vmax;
  }
}
`.trim();
}

/**
 * Main entry — returns the full CSS string for the requested variant + start position.
 */
export function generateTransitionCSS(
  variant: TransitionVariant = "circle",
  start: StartPosition = "top-right"
): string {
  switch (variant) {
    case "circle":
      return generateCircleCSS(start);
    default:
      return generateCircleCSS(start);
  }
}
