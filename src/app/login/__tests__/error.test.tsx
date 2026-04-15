import { ChakraProvider } from '@chakra-ui/react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import LoginError from '../error';
import { system } from '@/theme';

function wrap(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

describe('login/error.tsx', () => {
  it('renders fallback and wires reset', () => {
    const reset = vi.fn();
    wrap(
      <LoginError
        error={new Error('nope')}
        reset={reset}
      />,
    );
    expect(screen.getByText('Login unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
