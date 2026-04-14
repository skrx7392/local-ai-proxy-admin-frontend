'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Returns `true` until BOTH:
 *   1. the caller's `isPending` flag flipped to `false`, AND
 *   2. `minMs` have elapsed since pending started.
 *
 * Keeps skeletons on-screen for at least `minMs` so fast responses don't cause
 * a 20ms flash-then-vanish animation. Default 120ms per PLAN.md §8.
 *
 * Implementation uses the "derived state from props" render-phase pattern: we
 * compare the previous pending prop value in render, and if we observe a
 * false→true transition we mirror that into `showing` by calling setState
 * DURING render (React pattern — flushed before commit, no extra render
 * pair). The trailing edge (true→false) is handled in a useEffect that sets
 * state exclusively from inside setTimeout callbacks.
 */
export function useMinDuration(isPending: boolean, minMs = 120): boolean {
  const [showing, setShowing] = useState(isPending);
  const [prevPending, setPrevPending] = useState(isPending);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Render-phase derived update: catch pending rising edges.
  if (isPending !== prevPending) {
    setPrevPending(isPending);
    if (isPending) setShowing(true);
  }

  useEffect(() => {
    if (isPending) {
      // Mark the start of a pending window.
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      startedAtRef.current = performance.now();
      return;
    }

    // Pending → false transition: compute remaining grace time.
    const started = startedAtRef.current;
    if (started == null) {
      // There was no prior pending → reflect that immediately via timer (next tick).
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setShowing(false);
      }, 0);
      return () => {
        if (timerRef.current != null) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }
    const elapsed = performance.now() - started;
    const remaining = Math.max(0, minMs - elapsed);
    timerRef.current = setTimeout(() => {
      startedAtRef.current = null;
      timerRef.current = null;
      setShowing(false);
    }, remaining);

    return () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPending, minMs]);

  return showing;
}
