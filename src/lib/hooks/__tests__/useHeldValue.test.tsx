import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useHeldValue } from '../useHeldValue';

/**
 * Tiny probe that renders whatever `useHeldValue` returns, so the test can
 * assert on the held-vs-live value directly without depending on any dialog's
 * mount/animation timing.
 */
function Probe({ active, value }: { active: boolean; value: string | null }) {
  const shown = useHeldValue(active, value);
  return <div data-testid="out">{shown ?? '<null>'}</div>;
}

describe('useHeldValue', () => {
  it('returns the live value while active', () => {
    render(<Probe active value="edit" />);
    expect(screen.getByTestId('out')).toHaveTextContent('edit');
  });

  it('keeps returning the last active value after active flips to false', () => {
    // This is the anti-flash contract: the parent nulls the backing data at
    // the same moment it closes the dialog, and the closing dialog must keep
    // showing what it showed while open.
    const { rerender } = render(<Probe active value="edit" />);
    expect(screen.getByTestId('out')).toHaveTextContent('edit');

    // Close + clear in one update, exactly as the pages do.
    rerender(<Probe active={false} value={null} />);
    expect(screen.getByTestId('out')).toHaveTextContent('edit');
  });

  it('tracks value changes that happen while active', () => {
    const { rerender } = render(<Probe active value="edit-a" />);
    rerender(<Probe active value="edit-b" />);
    expect(screen.getByTestId('out')).toHaveTextContent('edit-b');

    rerender(<Probe active={false} value={null} />);
    expect(screen.getByTestId('out')).toHaveTextContent('edit-b');
  });

  it('adopts the new value immediately on reopen, not the previously held one', () => {
    const { rerender } = render(<Probe active value="first" />);
    rerender(<Probe active={false} value={null} />);
    expect(screen.getByTestId('out')).toHaveTextContent('first');

    // Reopen with a different backing value: the fresh value wins right away.
    rerender(<Probe active value="second" />);
    expect(screen.getByTestId('out')).toHaveTextContent('second');
  });

  it('ignores value churn while inactive (holds the last active value)', () => {
    const { rerender } = render(<Probe active value="held" />);
    rerender(<Probe active={false} value={null} />);
    // Parent re-renders while the dialog is closed with yet another value —
    // the held value must not change until the dialog is active again.
    rerender(<Probe active={false} value="noise" />);
    expect(screen.getByTestId('out')).toHaveTextContent('held');
  });

  it('starts from the initial value when mounted inactive', () => {
    render(<Probe active={false} value="initial" />);
    expect(screen.getByTestId('out')).toHaveTextContent('initial');
  });
});
