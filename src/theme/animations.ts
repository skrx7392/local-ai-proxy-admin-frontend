import { defineKeyframes } from '@chakra-ui/react';

/**
 * Motion tokens per PLAN.md §7.
 *
 * Three exports per named animation:
 *  - `keyframes` block (fed to Chakra via `defineKeyframes`)
 *  - `css` string helper (raw `animation:` declaration for when you can't reach Chakra)
 *  - `preset` object (drop into recipe base/variants)
 *
 * Durations and easings live in tokens.ts; this file references them by name.
 */

// ---------------------------------------------------------------------------
// Keyframes — consumed by `theme.keyframes` in index.ts so selectors like
// `animationName: "rise"` resolve.
// ---------------------------------------------------------------------------
export const keyframes = defineKeyframes({
  fade: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  rise: {
    from: { opacity: 0, transform: 'translateY(8px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
  pop: {
    from: { opacity: 0, transform: 'scale(0.96)' },
    to: { opacity: 1, transform: 'scale(1)' },
  },
  slideIn: {
    from: { opacity: 0, transform: 'translateY(24px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
  shimmer: {
    '0%': { backgroundPosition: '-400px 0' },
    '100%': { backgroundPosition: '400px 0' },
  },
  pulse: {
    '0%, 100%': { opacity: 0.6 },
    '50%': { opacity: 1 },
  },
  press: {
    from: { transform: 'scale(1)' },
    to: { transform: 'scale(0.98)' },
  },
  lift: {
    from: { transform: 'translateY(0)' },
    to: { transform: 'translateY(-2px)' },
  },
});

// ---------------------------------------------------------------------------
// Raw CSS strings — for places that can't reach into recipes / system
// (e.g. inline style on a Playwright-snapshot skeleton).
// ---------------------------------------------------------------------------
export const css = {
  fade: 'fade 220ms cubic-bezier(0.2, 0, 0, 1) both',
  rise: 'rise 220ms cubic-bezier(0, 0, 0.1, 1) both',
  pop: 'pop 180ms cubic-bezier(0.3, 0, 0.1, 1) both',
  slideIn: 'slideIn 320ms cubic-bezier(0.3, 0, 0.1, 1) both',
  // 1400ms infinite linear sweep
  shimmer: 'shimmer 1400ms linear infinite',
  pulse: 'pulse 2000ms ease-in-out infinite',
  press: 'press 80ms cubic-bezier(0.2, 0, 0, 1) both',
  lift: 'lift 140ms cubic-bezier(0.2, 0, 0, 1) both',
} as const;

// ---------------------------------------------------------------------------
// Preset style objects for recipe `base` / `variants`.
// These map 1:1 to Chakra system style objects.
// ---------------------------------------------------------------------------
export const preset = {
  fade: {
    animationName: 'fade',
    animationDuration: 'md',
    animationTimingFunction: 'standard',
    animationFillMode: 'both',
  },
  rise: {
    animationName: 'rise',
    animationDuration: 'md',
    animationTimingFunction: 'decelerate',
    animationFillMode: 'both',
  },
  pop: {
    animationName: 'pop',
    animationDuration: '180ms',
    animationTimingFunction: 'emphasized',
    animationFillMode: 'both',
  },
  slideIn: {
    animationName: 'slideIn',
    animationDuration: 'lg',
    animationTimingFunction: 'emphasized',
    animationFillMode: 'both',
  },
  slideOut: {
    animationName: 'slideIn',
    animationDuration: '180ms',
    animationTimingFunction: 'accelerate',
    animationDirection: 'reverse',
    animationFillMode: 'both',
  },
  shimmer: {
    animation: css.shimmer,
  },
  pulse: {
    animation: css.pulse,
  },
  press: {
    animationName: 'press',
    animationDuration: 'xs',
    animationTimingFunction: 'standard',
    animationFillMode: 'both',
  },
  lift: {
    animationName: 'lift',
    animationDuration: 'sm',
    animationTimingFunction: 'standard',
    animationFillMode: 'both',
  },
} as const;

/**
 * countUp is not a CSS animation — it's driven by `src/lib/utils/countUp.ts`.
 * Exposed here so the motion surface has a single source of truth.
 */
export const countUpSpec = {
  durationMs: 600,
  easing: 'cubic-bezier(0, 0, 0.1, 1)', // ease-out / decelerate
} as const;

/**
 * Wrap a style object in the `reduce` selector so it applies only when the
 * user has NOT asked for reduced motion. Pair with an opacity-only fallback
 * inside the recipe for the reduced-motion case.
 */
export function reduceMotion<T extends Record<string, unknown>>(
  style: T,
): { _motionSafe: T; _motionReduce: { animation: 'none'; transition: 'opacity 200ms linear' } } {
  return {
    _motionSafe: style,
    _motionReduce: {
      animation: 'none',
      transition: 'opacity 200ms linear',
    },
  };
}
