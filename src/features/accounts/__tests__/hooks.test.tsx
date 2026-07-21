import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { server } from '@/test/msw/server';
import { useMockBackend } from '@/test/msw/useMockBackend';

import {
  TopUpPartialError,
  useAccountsList,
  useCreateAccountKey,
  useCreditRequests,
  useGrantCredits,
  useResolveCreditRequest,
  useSetAllowance,
  useTopUpCreditRequest,
} from '../hooks';
import type { CreditRequest } from '../schemas';

// Wrapper variant that exposes the QueryClient so tests can observe
// invalidation behavior (the onSettled contracts below).
function wrapperWithClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { client, Wrapper };
}

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

const pendingRequest: CreditRequest = {
  id: 71,
  account_id: 503,
  account_name: 'enduser@example.com',
  email: 'enduser@example.com',
  period: '2026-07-01',
  status: 'pending',
  created_at: '2026-07-21T09:00:00Z',
  resolved_at: null,
  resolved_note: null,
  effective_monthly_grant: 5,
  balance: 0,
};

describe('useCreditRequests', () => {
  useMockBackend();

  it('returns envelope-parsed pending requests with grant + balance', async () => {
    const { result } = renderHook(() => useCreditRequests(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const first = result.current.data?.data[0];
    expect(first?.account_id).toBe(503);
    expect(first?.status).toBe('pending');
    expect(first?.effective_monthly_grant).toBe(5);
  });

  it('passes the status filter as a query param', async () => {
    const seen: string[] = [];
    server.use(
      http.get('*/api/admin/credit-requests', ({ request }) => {
        seen.push(new URL(request.url).searchParams.toString());
        return HttpResponse.json({
          data: [],
          pagination: { limit: 25, offset: 0, total: 0 },
        });
      }),
    );
    const { result } = renderHook(() => useCreditRequests('granted'), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(seen[0]).toContain('status=granted');
  });
});

describe('useResolveCreditRequest', () => {
  useMockBackend();

  it('PUTs status + note and unwraps the data envelope', async () => {
    let body: unknown;
    server.use(
      http.put('*/api/admin/credit-requests/:id', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: { id: 71, status: 'dismissed' } });
      }),
    );
    const { result } = renderHook(() => useResolveCreditRequest(), {
      wrapper: wrapper(),
    });
    let out: { id: number; status: string } | undefined;
    await act(async () => {
      out = await result.current.mutateAsync({
        id: 71,
        status: 'dismissed',
        note: 'dismissed via admin console',
      });
    });
    expect(body).toEqual({
      status: 'dismissed',
      note: 'dismissed via admin console',
    });
    expect(out?.status).toBe('dismissed');
  });
});

describe('useTopUpCreditRequest', () => {
  useMockBackend();

  it('marks the request granted BEFORE granting credits (idempotency lock)', async () => {
    const calls: string[] = [];
    server.use(
      http.put('*/api/admin/credit-requests/:id', () => {
        calls.push('resolve');
        return HttpResponse.json({ data: { id: 71, status: 'granted' } });
      }),
      http.post('*/api/admin/accounts/:id/credits', () => {
        calls.push('grant');
        return HttpResponse.json({ status: 'granted', amount: 5, balance: 5 });
      }),
    );
    const { result } = renderHook(() => useTopUpCreditRequest(), {
      wrapper: wrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync({
        request: pendingRequest,
        values: { amount: 5, description: 'top-up' },
      });
    });
    expect(calls).toEqual(['resolve', 'grant']);
  });

  it('never grants when the mark step is refused (409 stale/raced)', async () => {
    const calls: string[] = [];
    server.use(
      http.put('*/api/admin/credit-requests/:id', () => {
        calls.push('resolve');
        return HttpResponse.json(
          {
            error: {
              code: 'request_expired',
              type: 'invalid_request_error',
              message: 'Credit request expired at month rollover',
            },
          },
          { status: 409 },
        );
      }),
      http.post('*/api/admin/accounts/:id/credits', () => {
        calls.push('grant');
        return HttpResponse.json({ status: 'granted', amount: 5, balance: 5 });
      }),
    );
    const { result } = renderHook(() => useTopUpCreditRequest(), {
      wrapper: wrapper(),
    });
    await act(async () => {
      await expect(
        result.current.mutateAsync({
          request: pendingRequest,
          values: { amount: 5 },
        }),
      ).rejects.toThrow();
    });
    expect(calls).toEqual(['resolve']);
  });

  it('throws TopUpPartialError and refetches the queue when the grant fails after marking', async () => {
    server.use(
      http.put('*/api/admin/credit-requests/:id', () =>
        HttpResponse.json({ data: { id: 71, status: 'granted' } }),
      ),
      http.post('*/api/admin/accounts/:id/credits', () =>
        HttpResponse.json(
          {
            error: {
              code: 'internal_error',
              type: 'server_error',
              message: 'boom',
            },
          },
          { status: 500 },
        ),
      ),
    );
    const { client, Wrapper } = wrapperWithClient();
    const invalidated: unknown[] = [];
    const original = client.invalidateQueries.bind(client);
    client.invalidateQueries = ((filters: { queryKey?: unknown }) => {
      invalidated.push(filters?.queryKey);
      return original(filters as never);
    }) as typeof client.invalidateQueries;

    const { result } = renderHook(() => useTopUpCreditRequest(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      await expect(
        result.current.mutateAsync({
          request: pendingRequest,
          values: { amount: 5 },
        }),
      ).rejects.toBeInstanceOf(TopUpPartialError);
    });
    // The server-side row is granted with no money moved: the stale pending
    // card must be refetched away even though the mutation failed.
    expect(invalidated).toContainEqual(['creditRequests']);
  });
});

describe('useResolveCreditRequest conflict handling', () => {
  useMockBackend();

  it('refetches the queue even when the PUT 409s (resolved elsewhere)', async () => {
    server.use(
      http.put('*/api/admin/credit-requests/:id', () =>
        HttpResponse.json(
          {
            error: {
              code: 'already_resolved',
              type: 'invalid_request_error',
              message: 'Credit request was already resolved',
            },
          },
          { status: 409 },
        ),
      ),
    );
    const { client, Wrapper } = wrapperWithClient();
    const invalidated: unknown[] = [];
    const original = client.invalidateQueries.bind(client);
    client.invalidateQueries = ((filters: { queryKey?: unknown }) => {
      invalidated.push(filters?.queryKey);
      return original(filters as never);
    }) as typeof client.invalidateQueries;

    const { result } = renderHook(() => useResolveCreditRequest(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 71, status: 'dismissed' }),
      ).rejects.toThrow();
    });
    expect(invalidated).toContainEqual(['creditRequests']);
  });
});

describe('useSetAllowance', () => {
  useMockBackend();

  it('PUTs a numeric override', async () => {
    let body: unknown;
    server.use(
      http.put('*/api/admin/accounts/:id/allowance', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ status: 'updated', monthly_grant: 12.5 });
      }),
    );
    const { result } = renderHook(() => useSetAllowance(503), {
      wrapper: wrapper(),
    });
    let out: { monthly_grant: number | null } | undefined;
    await act(async () => {
      out = await result.current.mutateAsync(12.5);
    });
    expect(body).toEqual({ monthly_grant: 12.5 });
    expect(out?.monthly_grant).toBe(12.5);
  });

  it('PUTs an explicit null to revert to the env default', async () => {
    let body: unknown;
    server.use(
      http.put('*/api/admin/accounts/:id/allowance', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ status: 'updated', monthly_grant: null });
      }),
    );
    const { result } = renderHook(() => useSetAllowance(503), {
      wrapper: wrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync(null);
    });
    // The null must be spelled out on the wire — {} would be a silent no-op.
    expect(body).toEqual({ monthly_grant: null });
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
