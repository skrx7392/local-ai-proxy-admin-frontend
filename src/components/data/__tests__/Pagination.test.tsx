import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Pagination } from '../Pagination';
import { system } from '@/theme';

function wrap(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

describe('Pagination', () => {
  it('renders total-aware range text', () => {
    wrap(
      <Pagination
        limit={10}
        offset={20}
        total={57}
        pageRowCount={10}
        onChange={() => {}}
      />,
    );
    expect(screen.getByTestId('pagination-range')).toHaveTextContent('21–30 of 57');
  });

  it('disables Prev on the first page', () => {
    wrap(
      <Pagination
        limit={10}
        offset={0}
        total={100}
        pageRowCount={10}
        onChange={() => {}}
      />,
    );
    expect(screen.getByTestId('pagination-prev')).toBeDisabled();
    expect(screen.getByTestId('pagination-next')).not.toBeDisabled();
  });

  it('disables Next on the last page when total is known', () => {
    wrap(
      <Pagination
        limit={10}
        offset={20}
        total={27}
        pageRowCount={7}
        onChange={() => {}}
      />,
    );
    expect(screen.getByTestId('pagination-next')).toBeDisabled();
  });

  it('emits {limit, offset: 0} when the page size changes', () => {
    const onChange = vi.fn();
    wrap(
      <Pagination
        limit={10}
        offset={30}
        total={100}
        pageRowCount={10}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('Rows per page'), {
      target: { value: '25' },
    });
    expect(onChange).toHaveBeenCalledWith({ limit: 25, offset: 0 });
  });

  it('advances offset by limit on Next', () => {
    const onChange = vi.fn();
    wrap(
      <Pagination
        limit={10}
        offset={10}
        total={100}
        pageRowCount={10}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId('pagination-next'));
    expect(onChange).toHaveBeenCalledWith({ limit: 10, offset: 20 });
  });

  it('never lets Prev push offset below 0', () => {
    const onChange = vi.fn();
    wrap(
      <Pagination
        limit={25}
        offset={10}
        total={100}
        pageRowCount={10}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId('pagination-prev'));
    expect(onChange).toHaveBeenCalledWith({ limit: 25, offset: 0 });
  });
});
