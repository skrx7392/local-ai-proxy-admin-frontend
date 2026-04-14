/**
 * Canvas gradients per PLAN.md §2. Applied to <body> with
 * `background-attachment: fixed` via globalCss.
 */
export const canvasDark = 'linear-gradient(135deg, #0f2027 0%, #2c5364 50%, #4568dc 100%)';
export const canvasLight = 'linear-gradient(135deg, #dbeafe 0%, #c7d2fe 50%, #e9d5ff 100%)';

/**
 * Accent solid (primary CTA gradient) — same in both modes.
 */
export const accentSolid = 'linear-gradient(135deg, #4f46e5, #7c3aed)';

/**
 * Helper for chart sequential gradients (from one of the qualitative
 * palette anchors to a translucent tail). Used by dataViz derivations.
 */
export function chartGradient(from: string, toAlpha = 0): string {
  return `linear-gradient(180deg, ${from} 0%, rgba(255,255,255,${toAlpha}) 100%)`;
}
