'use client';

import { Box } from '@chakra-ui/react';
import type { CSSProperties, ComponentProps } from 'react';

/**
 * Internal primitive used by all skeleton components. A single gradient-sweep
 * bar. Uses the `shimmer` keyframe registered in the theme — no inline
 * keyframe strings (per PLAN.md §8: "Use the `shimmer` keyframe from
 * `animations.ts` — do NOT inline the animation here").
 *
 * When `animate={false}` the shimmer class/anim is suppressed, producing a
 * static placeholder suitable for Playwright visual regression.
 */
export interface ShimmerBarProps extends Omit<ComponentProps<typeof Box>, 'className'> {
  /** Render without animation (deterministic screenshots). */
  animate?: boolean;
  /** Height in px. Default 12. */
  h?: number | string;
}

export function ShimmerBar({ animate = true, h = 12, style, ...rest }: ShimmerBarProps) {
  const shimmerStyle: CSSProperties = animate
    ? {
        backgroundImage:
          'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.05) 100%)',
        backgroundSize: '800px 100%',
        animation: 'shimmer 1400ms linear infinite',
      }
    : {
        backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.10), rgba(255,255,255,0.10))',
      };

  return (
    <Box
      data-shimmer={animate ? 'true' : 'false'}
      aria-hidden="true"
      borderRadius="sm"
      h={typeof h === 'number' ? `${h}px` : h}
      background="bg.glass.subtle"
      style={{ ...shimmerStyle, ...style }}
      {...rest}
    />
  );
}
