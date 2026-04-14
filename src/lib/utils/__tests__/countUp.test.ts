import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { countUp } from '@/lib/utils/countUp';

describe('countUp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom's RAF uses setTimeout; re-route it through fake timers at ~60fps.
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      return setTimeout(() => cb(performance.now()), 16) as unknown as number;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) =>
      clearTimeout(id as unknown as ReturnType<typeof setTimeout>),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('interpolates to the exact target value on the final frame', () => {
    const frames: number[] = [];
    const cancel = countUp({ from: 0, to: 100, durationMs: 100 })((n) => {
      frames.push(n);
    });

    // Drive past the duration (plenty of 16ms RAF ticks).
    vi.advanceTimersByTime(200);

    expect(frames.length).toBeGreaterThan(0);
    expect(frames[frames.length - 1]).toBe(100);
    cancel();
  });

  it('emits the target synchronously when from === to', () => {
    const frames: number[] = [];
    countUp({ from: 42, to: 42 })((n) => frames.push(n));
    expect(frames).toEqual([42]);
  });

  it('cancel stops further frames', () => {
    const frames: number[] = [];
    const cancel = countUp({ from: 0, to: 1000, durationMs: 1000 })((n) => {
      frames.push(n);
    });
    vi.advanceTimersByTime(32);
    const before = frames.length;
    cancel();
    vi.advanceTimersByTime(1000);
    expect(frames.length).toBe(before);
  });
});
