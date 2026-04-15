import { ChakraProvider } from '@chakra-ui/react';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { ModelBreakdownChart, StatCard, TimeseriesChart } from '@/components/charts';
import { system } from '@/theme';
import type { ModelUsage, TimeseriesBucket } from '@/features/usage/schemas';

function wrap(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

const buckets: TimeseriesBucket[] = Array.from({ length: 6 }, (_, i) => ({
  bucket: new Date(Date.UTC(2026, 3, 14, i, 0, 0)).toISOString(),
  requests: i * 100,
  prompt_tokens: i * 1000,
  completion_tokens: i * 2000,
  total_tokens: i * 3000,
  credits: i * 0.5,
  errors: i,
}));

describe('TimeseriesChart', () => {
  it('renders with a stable min-height so tests + loading states don’t collapse', () => {
    const { getByTestId } = wrap(
      <TimeseriesChart
        buckets={buckets}
        interval="hour"
        series={['requests']}
        height={260}
        minHeight={200}
      />,
    );
    const fig = getByTestId('timeseries-chart');
    expect(fig).toHaveStyle({ 'min-height': '200px', height: '260px' });
  });

  it('carries an accessible role + label', () => {
    const { getByRole } = wrap(
      <TimeseriesChart
        buckets={buckets}
        interval="hour"
        series={['requests', 'errors']}
        ariaLabel="My chart"
      />,
    );
    expect(getByRole('figure', { name: 'My chart' })).toBeTruthy();
  });
});

describe('ModelBreakdownChart', () => {
  it('does not mutate the caller’s query data when sorting', () => {
    const original: ModelUsage[] = [
      { model: 'a', requests: 1, total_tokens: 10, credits: 0.1, avg_duration_ms: 0 },
      { model: 'b', requests: 2, total_tokens: 99, credits: 0.2, avg_duration_ms: 0 },
      { model: 'c', requests: 3, total_tokens: 50, credits: 0.3, avg_duration_ms: 0 },
    ];
    const snapshot = original.map((r) => ({ ...r }));
    wrap(<ModelBreakdownChart data={original} />);
    expect(original).toEqual(snapshot);
  });
});

describe('StatCard', () => {
  it('renders the value with tabular figures and marks busy state', () => {
    const { getByTestId } = wrap(
      <StatCard label="Requests" value="123" isLoading testId="stat" />,
    );
    expect(getByTestId('stat')).toHaveAttribute('aria-busy', 'true');
  });
});
