import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { useEffect, useReducer } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { server } from '@/test/msw/server';
import { useMockBackend } from '@/test/msw/useMockBackend';
import { system } from '@/theme';

import UsagePage from '../usage/page';

// Stateful next/navigation mock: `router.replace` rewrites the params and
// re-renders the page, so URL round-trips (pick → replace → useSearchParams
// → query key → request) run exactly like in the app.
const mockUrl = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const state = {
    params: new URLSearchParams(),
    listeners,
    replace(url: string) {
      state.params = new URLSearchParams(url.split('?')[1] ?? '');
      for (const notify of listeners) notify();
    },
  };
  return state;
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: (url: string) => mockUrl.replace(url) }),
  usePathname: () => '/usage',
  useSearchParams: () => mockUrl.params,
}));

function Harness() {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    mockUrl.listeners.add(force);
    return () => {
      mockUrl.listeners.delete(force);
    };
  }, []);
  return <UsagePage />;
}

function wrap() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>
    </ChakraProvider>,
  );
}

const SINCE = '2026-04-13T00:00:00.000Z';
const UNTIL = '2026-04-14T00:00:00.000Z';

const EMPTY_SUMMARY = {
  requests: 0,
  prompt_tokens: 0,
  completion_tokens: 0,
  total_tokens: 0,
  credits: 0,
  avg_duration_ms: 0,
  errors: 0,
};

describe('/usage — entity filter reaches the analytics query params', () => {
  useMockBackend();

  it('sends the picked account_id on /usage/summary and preserves the range', async () => {
    mockUrl.params = new URLSearchParams({ since: SINCE, until: UNTIL });
    const seen: URLSearchParams[] = [];
    server.use(
      http.get('*/api/admin/usage/summary', ({ request }) => {
        seen.push(new URL(request.url).searchParams);
        return HttpResponse.json({ data: EMPTY_SUMMARY });
      }),
    );

    wrap();
    // First fetch: range only, no entity filter.
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    expect(seen[0]?.get('account_id')).toBeNull();

    // Open Advanced and pick an account by name.
    fireEvent.click(screen.getByTestId('usage-filter-advanced-toggle'));
    const input = screen.getByTestId('usage-filter-account-id');
    fireEvent.click(input);
    fireEvent.click(await screen.findByText('Batch Pipeline (502)'));

    // The pick lands in the URL and the summary query refetches with it.
    await waitFor(() => {
      const last = seen[seen.length - 1];
      expect(last?.get('account_id')).toBe('502');
    });
    const last = seen[seen.length - 1];
    expect(last?.get('since')).toBe(SINCE);
    expect(last?.get('until')).toBe(UNTIL);
  });

  it('applies a deep-linked account_id to another tab (by-model) as well', async () => {
    mockUrl.params = new URLSearchParams({
      since: SINCE,
      until: UNTIL,
      account_id: '502',
      tab: 'by-model',
    });
    const seen: URLSearchParams[] = [];
    server.use(
      http.get('*/api/admin/usage/by-model', ({ request }) => {
        seen.push(new URL(request.url).searchParams);
        return HttpResponse.json({
          data: [],
          pagination: { limit: 25, offset: 0, total: 0 },
        });
      }),
    );

    wrap();
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    expect(seen[0]?.get('account_id')).toBe('502');
  });

  it('maps legacy tab=by-user deep links to the By-account tab', async () => {
    // The breakdown tab was `by-user` before EUA; old bookmarks must land on
    // its replacement, not silently fall back to Summary. lazyMount means the
    // by-account request only fires if the alias actually selected the tab.
    mockUrl.params = new URLSearchParams({
      since: SINCE,
      until: UNTIL,
      tab: 'by-user',
    });
    const seen: URLSearchParams[] = [];
    server.use(
      http.get('*/api/admin/usage/by-account', ({ request }) => {
        seen.push(new URL(request.url).searchParams);
        return HttpResponse.json({
          data: [],
          pagination: { limit: 25, offset: 0, total: 0 },
        });
      }),
    );

    wrap();
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
  });

  it('threads table pagination into the by-account request', async () => {
    mockUrl.params = new URLSearchParams({
      since: SINCE,
      until: UNTIL,
      tab: 'by-account',
      limit: '25',
      offset: '25',
    });
    const seen: URLSearchParams[] = [];
    server.use(
      http.get('*/api/admin/usage/by-account', ({ request }) => {
        seen.push(new URL(request.url).searchParams);
        return HttpResponse.json({
          data: [],
          pagination: { limit: 25, offset: 25, total: 60 },
        });
      }),
    );

    wrap();
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    expect(seen[0]?.get('limit')).toBe('25');
    expect(seen[0]?.get('offset')).toBe('25');
  });
});
