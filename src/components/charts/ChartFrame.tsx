'use client';

import { Box } from '@chakra-ui/react';
import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export interface ChartSize {
  width: number;
  height: number;
}

/**
 * Recharts 3 draws series through JS-driven enter animations — a
 * stroke-dasharray reveal for lines, a height scale-up for bars — timed by
 * its own rAF queue and mount-time DOM measurements. On client-side
 * navigations (Next App Router + React 19) that animation reliably fails to
 * start: observed live as a complete line path frozen at
 * `stroke-dasharray: 0px, <total>px` (zero pixels visible) and bars flat at
 * y=0 until an unrelated re-render restarted it.
 *
 * A chart that can render invisible is worse than a chart that doesn't
 * animate, so enter animations stay off for every chart in the app. Pass
 * this to `isAnimationActive` rather than a bare `false` so the rationale
 * has one home.
 */
export const CHART_ENTER_ANIMATION = false;

export interface ChartFrameProps {
  /** Fixed pixel height of the chart slot. Reserved before the chart mounts. */
  height?: number;
  minHeight?: number;
  ariaLabel: string;
  testId?: string;
  /** Render-prop invoked only once the slot has a real, settled size. */
  children: (size: ChartSize) => ReactNode;
}

// Schedule a callback for the next animation frame, falling back to a timer
// where rAF is unavailable (jsdom without pretendToBeVisual, SSR edge cases).
function scheduleFrame(callback: () => void): () => void {
  if (typeof requestAnimationFrame === 'function') {
    const id = requestAnimationFrame(() => callback());
    return () => cancelAnimationFrame(id);
  }
  const id = setTimeout(callback, 16);
  return () => clearTimeout(id);
}

/**
 * Shared measurement gate for every recharts chart in the app.
 *
 * Recharts 3 draws series through JS-driven enter animations that latch onto
 * the geometry present at mount (`getTotalLength()` for lines, height scale
 * for bars). When a chart mounts during a client-side navigation or tab
 * activation — while layout is still settling — that animation captures
 * zero/stale geometry and the chart paints axes-only, bars flat at y=0, or a
 * stub of a line until an unrelated re-render restarts it.
 *
 * ChartFrame removes the race instead of each chart working around it:
 *
 * 1. The outer Box reserves the chart's final height immediately, so nothing
 *    below it shifts when the chart appears (no first-click misses).
 * 2. The chart mounts only after the slot reports a non-zero size, and one
 *    settle frame later — guaranteeing the enter animation starts against
 *    real, painted geometry with a live rAF pipeline.
 * 3. The measured pixel size is passed down explicitly, so charts render with
 *    fixed dimensions and skip ResponsiveContainer's own initial-measure race.
 * 4. If the slot collapses to zero (hidden tab, mid-transition) the chart
 *    unmounts; the next non-zero measurement mounts it fresh, restarting the
 *    enter animation cleanly.
 */
export function ChartFrame({
  height = 280,
  minHeight = 240,
  ariaLabel,
  testId,
  children,
}: ChartFrameProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<ChartSize | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    let cancelFrame: (() => void) | null = null;
    let pending: ChartSize | null = null;

    const commit = () => {
      cancelFrame = null;
      const next = pending;
      pending = null;
      if (!next) return;
      setSize((prev) =>
        prev && prev.width === next.width && prev.height === next.height
          ? prev
          : next,
      );
    };

    const handleMeasure = (rawWidth: number, rawHeight: number) => {
      const width = Math.round(rawWidth);
      const measuredHeight = Math.round(rawHeight);
      if (width <= 0 || measuredHeight <= 0) {
        // Collapsed (hidden tab, transition frame): never mount a chart into
        // this, and drop any chart already mounted so the next expansion
        // mounts it fresh.
        pending = null;
        if (cancelFrame) {
          cancelFrame();
          cancelFrame = null;
        }
        setSize(null);
        return;
      }
      pending = { width, height: measuredHeight };
      // Defer the mount by one frame so the chart's enter animation begins
      // after this layout has actually been painted.
      cancelFrame ??= scheduleFrame(commit);
    };

    // Initial synchronous measure — ResizeObserver's first report can land a
    // frame late, and the chart should mount on the very next frame when the
    // layout is already correct.
    const rect = el.getBoundingClientRect();
    handleMeasure(rect.width, rect.height);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      handleMeasure(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (cancelFrame) cancelFrame();
      pending = null;
    };
  }, []);

  return (
    <Box
      ref={ref}
      width="100%"
      height={`${height}px`}
      minHeight={`${minHeight}px`}
      role="figure"
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {size ? children(size) : null}
    </Box>
  );
}
