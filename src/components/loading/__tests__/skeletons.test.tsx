import { ChakraProvider } from '@chakra-ui/react';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import {
  ChartSkeleton,
  DataTableSkeleton,
  FormSkeleton,
  StatCardSkeleton,
} from '@/components/loading';
import { system } from '@/theme';

function wrap(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

describe('skeleton components', () => {
  it('StatCardSkeleton renders with shimmer by default', () => {
    const { container } = wrap(<StatCardSkeleton />);
    expect(container.querySelectorAll('[data-shimmer="true"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-shimmer="false"]').length).toBe(0);
  });

  it('StatCardSkeleton animate=false omits the shimmer flag', () => {
    const { container } = wrap(<StatCardSkeleton animate={false} />);
    expect(container.querySelectorAll('[data-shimmer="true"]').length).toBe(0);
    expect(container.querySelectorAll('[data-shimmer="false"]').length).toBeGreaterThan(0);
  });

  it('DataTableSkeleton respects rows/columns props', () => {
    const { container } = wrap(<DataTableSkeleton rows={3} columns={2} />);
    // 1 header row × 2 bars + 3 body rows × 2 bars = 8 shimmer bars.
    const bars = container.querySelectorAll('[data-shimmer]');
    expect(bars.length).toBe(8);
  });

  it('ChartSkeleton renders a placeholder SVG and toggles animation', () => {
    const { container: animated } = wrap(<ChartSkeleton height={120} />);
    expect(animated.querySelector('svg[data-shimmer="true"]')).toBeTruthy();
    const { container: still } = wrap(<ChartSkeleton height={120} animate={false} />);
    expect(still.querySelector('svg[data-shimmer="false"]')).toBeTruthy();
  });

  it('FormSkeleton renders 2 bars per field (label + input)', () => {
    const { container } = wrap(<FormSkeleton fields={4} />);
    expect(container.querySelectorAll('[data-shimmer]').length).toBe(8);
  });
});
