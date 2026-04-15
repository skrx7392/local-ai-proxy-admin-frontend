import { render } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useHotkeys, type HotkeyBinding } from '../useHotkeys';

function Host({ bindings }: { bindings: HotkeyBinding[] }) {
  useHotkeys(bindings);
  return null;
}

function press(key: string, target: EventTarget = document) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  (target as Document).dispatchEvent(event);
  return event;
}

describe('useHotkeys', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires single-key bindings', () => {
    const onSlash = vi.fn();
    render(<Host bindings={[{ combo: '/', handler: onSlash }]} />);
    press('/');
    expect(onSlash).toHaveBeenCalledOnce();
  });

  it('fires chord bindings when the second key lands in time', () => {
    const gu = vi.fn();
    render(<Host bindings={[{ combo: 'g u', handler: gu }]} />);
    press('g');
    press('u');
    expect(gu).toHaveBeenCalledOnce();
  });

  it('cancels the chord after the timeout', () => {
    const gu = vi.fn();
    render(<Host bindings={[{ combo: 'g u', handler: gu }]} />);
    press('g');
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    press('u');
    expect(gu).not.toHaveBeenCalled();
  });

  it('suppresses shortcuts when focus is in an input', () => {
    const gu = vi.fn();
    const input = document.createElement('input');
    document.body.appendChild(input);
    render(<Host bindings={[{ combo: 'g u', handler: gu }]} />);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'u', bubbles: true }));
    expect(gu).not.toHaveBeenCalled();
    input.remove();
  });

  it('ignores keydown with modifier keys held', () => {
    const slash = vi.fn();
    render(<Host bindings={[{ combo: '/', handler: slash }]} />);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: '/', ctrlKey: true, bubbles: true }),
    );
    expect(slash).not.toHaveBeenCalled();
  });
});
