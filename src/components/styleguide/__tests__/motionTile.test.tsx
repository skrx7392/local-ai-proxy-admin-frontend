import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Providers } from '@/components/providers';
import { MotionTile } from '@/components/styleguide/MotionTile';

describe('MotionTile', () => {
  it('remounts the animated child when Replay is clicked', () => {
    render(
      <Providers>
        <MotionTile name="fade" spec="220ms · standard">
          {(k) => <div key={k} data-testid="animated" data-key={k} />}
        </MotionTile>
      </Providers>,
    );

    const initial = screen.getByTestId('animated');
    expect(initial.getAttribute('data-key')).toBe('0');

    fireEvent.click(screen.getByTestId('replay-fade'));

    // After replay the child has been remounted — reading the element again
    // from the DOM gives us the new instance with an incremented key. React's
    // key change unmounts the previous node and creates a fresh one.
    const after = screen.getByTestId('animated');
    expect(after.getAttribute('data-key')).toBe('1');
    // Crucially, it's a DIFFERENT DOM node (node-identity check).
    expect(after).not.toBe(initial);
  });
});
