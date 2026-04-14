/**
 * RAF-based number interpolation used by StatCard (and anywhere else a
 * value should animate toward its target). Pure function — no React.
 *
 * Usage:
 *   const cancel = countUp({ from: 0, to: 1234 })((n) => setVal(n));
 *   // later: cancel();
 */

export interface CountUpOptions {
  from: number;
  to: number;
  durationMs?: number;
  /** Easing function mapping `t` (0..1) → eased 0..1. Default: cubic ease-out. */
  easing?: (t: number) => number;
}

export type OnFrame = (value: number) => void;
export type CancelFn = () => void;

const defaultEasing = (t: number): number => 1 - Math.pow(1 - t, 3);

export function countUp(opts: CountUpOptions): (onFrame: OnFrame) => CancelFn {
  const { from, to, durationMs = 600, easing = defaultEasing } = opts;

  return (onFrame) => {
    // Guard: zero / negative duration → emit final frame synchronously.
    if (durationMs <= 0 || from === to) {
      onFrame(to);
      return () => {};
    }

    let cancelled = false;
    let rafId = 0;
    const start =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();

    const tick = (now: number): void => {
      if (cancelled) return;
      const elapsed = now - start;
      const t = Math.min(1, Math.max(0, elapsed / durationMs));
      const eased = easing(t);
      const value = from + (to - from) * eased;
      onFrame(value);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        // Snap final value exactly.
        onFrame(to);
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  };
}
