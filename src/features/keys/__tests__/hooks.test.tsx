import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { server } from '@/test/msw/server';
import { useMockBackend } from '@/test/msw/useMockBackend';

import { useCreateKey, useKeysList, useRevokeKey } from '../hooks';

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

// Hook tests use the real BFF URL (apiFetch resolves against
// window.location.origin); MSW's origin wildcard catches either shape.
// The AUTH_URL-less test env means window.location.origin is set
// by jsdom (http://localhost:3000 by default).

describe('useKeysList', () => {
  useMockBackend();

  it('fetches and returns the envelope-parsed key list', async () => {
    const { result } = renderHook(
      () => useKeysList({ limit: 10, offset: 0 }),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.length).toBeGreaterThan(0);
    expect(result.current.data?.pagination?.total).toBeGreaterThan(0);
  });

  it('passes is_active=true as a query param when filtered', async () => {
    const seen: string[] = [];
    server.use(
      http.get('*/api/admin/keys', ({ request }) => {
        seen.push(new URL(request.url).searchParams.toString());
        return HttpResponse.json({
          data: [],
          pagination: { limit: 10, offset: 0, total: 0 },
        });
      }),
    );

    const { result } = renderHook(
      () => useKeysList({ limit: 10, offset: 0, is_active: true }),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(seen[0]).toContain('is_active=true');
    expect(seen[0]).toContain('envelope=1');
  });
});

describe('useCreateKey', () => {
  useMockBackend();

  it('returns a parsed created key including the plaintext `key`', async () => {
    const { result } = renderHook(() => useCreateKey(), {
      wrapper: wrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ name: 'spec' });
    });

    // Matches internal/admin/admin.go::createKeyResponse — plaintext is in `key`.
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.key).toMatch(/^sk-/);
    expect(result.current.data?.name).toBe('spec');
  });

  it('surfaces backend errors as ApiError via the real error envelope', async () => {
    server.use(
      http.post('*/api/admin/keys', () =>
        HttpResponse.json(
          {
            error: {
              code: 'name_taken',
              message: 'That name is already in use.',
              type: 'invalid_request_error',
            },
          },
          { status: 409 },
        ),
      ),
    );

    const { result } = renderHook(() => useCreateKey(), {
      wrapper: wrapper(),
    });

    await act(async () => {
      await result.current
        .mutateAsync({ name: 'dup' })
        .catch(() => void 0);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('That name is already in use.');
  });
});

describe('useRevokeKey', () => {
  useMockBackend();

  it('resolves on a successful delete', async () => {
    const { result } = renderHook(() => useRevokeKey(), {
      wrapper: wrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(101);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
