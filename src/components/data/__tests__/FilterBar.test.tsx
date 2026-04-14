import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FilterBar } from '../FilterBar';
import { system } from '@/theme';

function wrap(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

describe('FilterBar', () => {
  it('renders children inside the bar', () => {
    wrap(
      <FilterBar>
        <button type="button">is_active</button>
      </FilterBar>,
    );
    expect(screen.getByRole('button', { name: 'is_active' })).toBeInTheDocument();
  });

  it('does not render Clear when no filter is active', () => {
    wrap(
      <FilterBar onClearFilters={() => {}}>
        <div />
      </FilterBar>,
    );
    expect(screen.queryByTestId('filter-bar-clear')).toBeNull();
  });

  it('renders and invokes Clear when filters are active', () => {
    const onClear = vi.fn();
    wrap(
      <FilterBar hasActiveFilters onClearFilters={onClear}>
        <div />
      </FilterBar>,
    );
    fireEvent.click(screen.getByTestId('filter-bar-clear'));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
