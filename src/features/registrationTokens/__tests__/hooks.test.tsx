import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { server } from '@/test/msw/server';
import { useMockBackend } from '@/test/msw/useMockBackend';

import {
  useCreateRegistrationToken,
  useRegistrationTokensList,
  useRevokeRegistrationToken,
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

describe('useRegistrationTokensList', () => {
  useMockBackend();

  it('returns envelope-parsed tokens (name, credit_grant, max_uses, uses, revoked)', async () => {
    const { result } = renderHook(
      () => useRegistrationTokensList({ limit: 10, offset: 0 }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const first = result.current.data?.data[0];
    expect(first?.name).toBe('ops-onboarding');
    expect(first?.credit_grant).toBeCloseTo(10.0);
    expect(first?.max_uses).toBe(5);
    expect(first?.uses).toBe(2);
    expect(first?.revoked).toBe(false);
  });

  it('filters by is_active via the backend-compatible param', async () => {
    const seen: string[] = [];
    server.use(
      http.get('*/api/admin/registration-tokens', ({ request }) => {
        seen.push(new URL(request.url).searchParams.toString());
        return HttpResponse.json({
          data: [],
          pagination: { limit: 10, offset: 0, total: 0 },
        });
      }),
    );
    const { result } = renderHook(
      () =>
        useRegistrationTokensList({ limit: 10, offset: 0, is_active: true }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(seen[0]).toContain('is_active=true');
    expect(seen[0]).toContain('envelope=1');
  });
});

describe('useCreateRegistrationToken', () => {
  useMockBackend();

  it('sends expires_at=null when the form omitted it', async () => {
    let body: unknown;
    server.use(
      http.post('*/api/admin/registration-tokens', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          {
            id: 999,
            name: 'spec',
            token: 'reg-' + 'f'.repeat(64),
            credit_grant: 5,
            max_uses: 1,
          },
          { status: 201 },
        );
      }),
    );
    const { result } = renderHook(() => useCreateRegistrationToken(), {
      wrapper: wrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync({
        name: 'spec',
        credit_grant: 5,
        max_uses: 1,
        expires_at: undefined,
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(body).toEqual({
      name: 'spec',
      credit_grant: 5,
      max_uses: 1,
      expires_at: null,
    });
    expect(result.current.data?.token).toMatch(/^reg-/);
  });
});

describe('useRevokeRegistrationToken', () => {
  useMockBackend();

  it('resolves on a successful DELETE', async () => {
    const { result } = renderHook(() => useRevokeRegistrationToken(), {
      wrapper: wrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync(301);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
