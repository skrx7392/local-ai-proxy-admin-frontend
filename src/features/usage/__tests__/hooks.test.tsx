import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { server } from '@/test/msw/server';
import { useMockBackend } from '@/test/msw/useMockBackend';

import { canonicalizeUsageFilters } from '../filters';
import {
  useUsageByModel,
  useUsageByUser,
  useUsageSummary,
  useUsageTimeseries,
} from '../hooks';

const FILTERS = canonicalizeUsageFilters({
  since: '2026-04-13T00:00:00.000Z',
  until: '2026-04-14T00:00:00.000Z',
})!;

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function wrapper() {
  const client = makeClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('usage hooks — query params + envelope parsing', () => {
  useMockBackend();

  it('useUsageSummary parses the detail envelope', async () => {
    const { result } = renderHook(() => useUsageSummary(FILTERS), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.requests).toBeGreaterThan(0);
  });

  it('useUsageByModel parses the list envelope', async () => {
    const { result } = renderHook(() => useUsageByModel(FILTERS), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.length).toBeGreaterThan(0);
    expect(result.current.data?.pagination.total).toBeGreaterThan(0);
  });

  it('useUsageByUser parses all three owner_type rows', async () => {
    const { result } = renderHook(() => useUsageByUser(FILTERS), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const types = result.current.data?.data.map((r) => r.owner_type) ?? [];
    expect(new Set(types).size).toBeGreaterThan(1);
  });

  it('useUsageTimeseries parses the detail envelope (not list!)', async () => {
    const { result } = renderHook(
      () => useUsageTimeseries({ ...FILTERS, interval: 'hour' }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.interval).toBe('hour');
    expect(result.current.data?.buckets.length).toBeGreaterThan(0);
  });

  it('passes canonical filters as query params to /usage/summary', async () => {
    const seen: string[] = [];
    server.use(
      http.get('*/api/admin/usage/summary', ({ request }) => {
        seen.push(new URL(request.url).searchParams.toString());
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

    const { result } = renderHook(
      () =>
        useUsageSummary(
          canonicalizeUsageFilters({ ...FILTERS, model: 'llama3.1:8b', account_id: 502 })!,
        ),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(seen[0]).toContain('since=');
    expect(seen[0]).toContain('until=');
    expect(seen[0]).toContain('model=llama3.1%3A8b');
    expect(seen[0]).toContain('account_id=502');
  });

  it('sends interval only on the timeseries endpoint', async () => {
    const sawInterval: Record<string, boolean> = {};
    server.use(
      http.get('*/api/admin/usage/summary', ({ request }) => {
        sawInterval.summary = new URL(request.url).searchParams.has('interval');
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
      http.get('*/api/admin/usage/timeseries', ({ request }) => {
        sawInterval.timeseries = new URL(request.url).searchParams.has('interval');
        return HttpResponse.json({
          data: { interval: 'day', buckets: [] },
        });
      }),
    );

    const { result: summaryResult } = renderHook(
      () => useUsageSummary(FILTERS),
      { wrapper: wrapper() },
    );
    const { result: tsResult } = renderHook(
      () => useUsageTimeseries({ ...FILTERS, interval: 'day' }),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(summaryResult.current.isSuccess).toBe(true));
    await waitFor(() => expect(tsResult.current.isSuccess).toBe(true));

    expect(sawInterval.summary).toBe(false);
    expect(sawInterval.timeseries).toBe(true);
  });

  it('stays disabled (no request) when filters is null', async () => {
    let hits = 0;
    server.use(
      http.get('*/api/admin/usage/summary', () => {
        hits++;
        return HttpResponse.json({ data: {} });
      }),
    );
    const { result } = renderHook(() => useUsageSummary(null), {
      wrapper: wrapper(),
    });
    // Give react-query a microtask to potentially fire.
    await new Promise((r) => setTimeout(r, 30));
    expect(result.current.fetchStatus).toBe('idle');
    expect(hits).toBe(0);
  });
});
