import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMinDuration } from '@/lib/utils/useMinDuration';

describe('useMinDuration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('holds at true for minMs even if pending flips to false immediately', () => {
    const { result, rerender } = renderHook(
      ({ pending }: { pending: boolean }) => useMinDuration(pending, 120),
      { initialProps: { pending: true } },
    );

    expect(result.current).toBe(true);

    // Pending resolves after only 40ms.
    act(() => {
      vi.advanceTimersByTime(40);
    });
    rerender({ pending: false });

    // Still true because 120ms hasn't elapsed.
    expect(result.current).toBe(true);

    // Advance past the 120ms floor.
    act(() => {
      vi.advanceTimersByTime(120);
    });
    expect(result.current).toBe(false);
  });

  it('returns false promptly if pending outlasts minMs', () => {
    const { result, rerender } = renderHook(
      ({ pending }: { pending: boolean }) => useMinDuration(pending, 100),
      { initialProps: { pending: true } },
    );
    expect(result.current).toBe(true);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    rerender({ pending: false });
    // Elapsed 500ms > 100ms minimum → flips false on the next tick.
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current).toBe(false);
  });
});
