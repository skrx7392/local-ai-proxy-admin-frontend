import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from '../EmptyState';
import { system } from '@/theme';

function wrap(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

describe('EmptyState', () => {
  it('renders title, description, and action', () => {
    wrap(
      <EmptyState
        title="No keys yet"
        description="Click new key."
        action={<button type="button">Create</button>}
      />,
    );
    expect(screen.getByText('No keys yet')).toBeInTheDocument();
    expect(screen.getByText('Click new key.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('is unframed by default (no card border wrapper around the content)', () => {
    const { container } = wrap(<EmptyState title="No keys yet" />);
    // The outermost child is the VStack itself, not a framed Box.
    const outer = container.firstChild as HTMLElement;
    expect(outer.getAttribute('data-testid')).toBe('empty-state');
  });

  it('renders a framed card when framed', () => {
    const { container } = wrap(<EmptyState title="No keys yet" framed />);
    const outer = container.firstChild as HTMLElement;
    // When framed, the outer node is the wrapper Box (no testid), and the
    // VStack lives inside it.
    expect(outer.getAttribute('data-testid')).toBeNull();
    expect(outer.querySelector('[data-testid="empty-state"]')).not.toBeNull();
  });
});
