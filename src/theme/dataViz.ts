/**
 * Data-visualization palette per PLAN.md §2.2. Single source of truth used by
 * every chart; never reach for UI semantic colors inside a chart.
 */

export const qualitativePalette = [
  '#60a5fa',
  '#a78bfa',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#22d3ee',
  '#f472b6',
  '#4ade80',
  '#f59e0b',
  '#818cf8',
] as const;

/** Sequential scale — accent-anchored (low → high intensity). */
export const sequentialPalette = [
  '#eef2ff',
  '#e0e7ff',
  '#c7d2fe',
  '#a5b4fc',
  '#818cf8',
  '#6366f1',
  '#4f46e5',
  '#4338ca',
  '#3730a3',
] as const;

/** Diverging scale — teal anchor on the negative end, accent indigo on the positive. */
export const divergingPalette = [
  '#0f766e', // teal-700
  '#14b8a6', // teal-500
  '#5eead4', // teal-300
  '#e0e7ff', // neutral mid
  '#a5b4fc',
  '#6366f1',
  '#4338ca',
] as const;

/**
 * Recharts theming object — tooltip/grid/axis surfaces. Consumed in PR F when
 * charts land; exposed here so the theme has a single export surface.
 */
export const rechartsTheme = {
  tooltip: {
    // `glass.elevated` at raw rgba so recharts (which renders outside our
    // Chakra root) can still use the right surface.
    contentStyle: {
      background: 'var(--chakra-colors-bg-glass-elevated, rgba(255,255,255,0.95))',
      border: '1px solid var(--chakra-colors-border-glass, rgba(15,23,42,0.08))',
      borderRadius: '10px',
      boxShadow: 'var(--chakra-shadows-e2)',
      fontFamily: 'var(--font-inter)',
      fontSize: '13px',
      fontVariantNumeric: 'tabular-nums',
      color: 'var(--chakra-colors-fg-default)',
      padding: '8px 12px',
    },
    labelStyle: {
      color: 'var(--chakra-colors-fg-muted)',
      fontSize: '12px',
    },
  },
  grid: {
    stroke: 'var(--chakra-colors-border-subtle)',
    strokeDasharray: '2 4',
  },
  axis: {
    stroke: 'var(--chakra-colors-border-subtle)',
    tick: {
      fill: 'var(--chakra-colors-fg-subtle)',
      fontSize: 12,
      fontFamily: 'var(--font-inter)',
    },
  },
} as const;

/** Convenience: pick a color by index, wrapping. */
export function qualitativeAt(index: number): string {
  const palette = qualitativePalette;
  const i = ((index % palette.length) + palette.length) % palette.length;
  return palette[i] ?? palette[0]!;
}
