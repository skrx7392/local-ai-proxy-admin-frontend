import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { server } from '@/test/msw/server';
import { useMockBackend } from '@/test/msw/useMockBackend';
import { system } from '@/theme';

import DashboardPage from '../page';

function wrap(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </ChakraProvider>,
  );
}

describe('Dashboard — summary + timeseries fetch independently', () => {
  useMockBackend();

  it('renders StatCards once summary resolves, without waiting on timeseries', async () => {
    // Hold the timeseries request open so the test can assert the
    // summary StatCards resolve while the chart is still pending.
    let releaseTimeseries: () => void = () => undefined;
    const timeseriesGate = new Promise<void>((resolve) => {
      releaseTimeseries = resolve;
    });

    server.use(
      http.get('*/api/admin/usage/timeseries', async () => {
        await timeseriesGate;
        return HttpResponse.json({
          data: { interval: 'hour', buckets: [] },
        });
      }),
    );

    const { getByTestId } = wrap(<DashboardPage />);

    // Summary StatCards populate while the timeseries request is still
    // in-flight — the "—" placeholder flips to a concrete number. This is
    // the strongest proof of query independence: the page did not gate the
    // StatCards behind the chart's still-pending promise.
    await waitFor(() => {
      expect(getByTestId('dashboard-stat-requests').textContent).not.toContain(
        '—',
      );
    });
    // The chart still has not rendered its actual data (no svg <path> for
    // the line series yet) because the request is gated.
    expect(
      getByTestId('dashboard-timeseries').querySelector(
        'svg path.recharts-curve',
      ),
    ).toBeNull();

    releaseTimeseries();
  });

  it('sends an absolute 24h range rather than relying on backend defaults', async () => {
    const seenParams: string[] = [];
    server.use(
      http.get('*/api/admin/usage/summary', ({ request }) => {
        seenParams.push(new URL(request.url).searchParams.toString());
        return HttpResponse.json({
          data: {
            requests: 0,
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
            credits: 0,
            avg_duration_ms: 0,
            errors: 0,
          },
        });
      }),
    );
    wrap(<DashboardPage />);
    await waitFor(() => expect(seenParams.length).toBeGreaterThan(0));
    const p = new URLSearchParams(seenParams[0]);
    expect(p.get('since')).toMatch(/Z$/);
    expect(p.get('until')).toMatch(/Z$/);
    const spanMs = Date.parse(p.get('until')!) - Date.parse(p.get('since')!);
    expect(spanMs).toBe(24 * 60 * 60 * 1000);
  });
});
