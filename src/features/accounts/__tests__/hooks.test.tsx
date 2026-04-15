import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { server } from '@/test/msw/server';
import { useMockBackend } from '@/test/msw/useMockBackend';

import {
  useAccountsList,
  useCreateAccountKey,
  useGrantCredits,
} from '../hooks';

function wrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useAccountsList', () => {
  useMockBackend();

  it('returns envelope-parsed accounts with available + reserved balances', async () => {
    const { result } = renderHook(
      () => useAccountsList({ limit: 10, offset: 0 }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const first = result.current.data?.data[0];
    expect(first?.available).toBeCloseTo(244.75);
    expect(first?.reserved).toBeCloseTo(5.25);
    expect(first?.balance).toBeCloseTo(250);
  });

  it('passes type + is_active as query params when filtered', async () => {
    const seen: string[] = [];
    server.use(
      http.get('*/api/admin/accounts', ({ request }) => {
        seen.push(new URL(request.url).searchParams.toString());
        return HttpResponse.json({
          data: [],
          pagination: { limit: 10, offset: 0, total: 0 },
        });
      }),
    );
    const { result } = renderHook(
      () =>
        useAccountsList({ limit: 10, offset: 0, type: 'service', is_active: true }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(seen[0]).toContain('type=service');
    expect(seen[0]).toContain('is_active=true');
    expect(seen[0]).toContain('envelope=1');
  });
});

describe('useGrantCredits', () => {
  useMockBackend();

  it('posts amount + description and returns the status/balance response', async () => {
    let body: unknown;
    server.use(
      http.post('*/api/admin/accounts/:id/credits', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ status: 'granted', amount: 50, balance: 300 });
      }),
    );
    const { result } = renderHook(() => useGrantCredits(501), {
      wrapper: wrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync({
        amount: 50,
        description: 'top-up',
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(body).toEqual({ amount: 50, description: 'top-up' });
    expect(result.current.data?.balance).toBe(300);
  });
});

describe('useCreateAccountKey', () => {
  useMockBackend();

  it('returns the real createKeyResponse shape (plaintext in `key`)', async () => {
    const { result } = renderHook(() => useCreateAccountKey(501), {
      wrapper: wrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync({ name: 'worker' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.key).toMatch(/^sk-/);
    expect(result.current.data?.name).toBe('worker');
  });
});
