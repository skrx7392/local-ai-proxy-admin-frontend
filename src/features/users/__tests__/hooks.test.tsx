import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { server } from '@/test/msw/server';
import { useMockBackend } from '@/test/msw/useMockBackend';

import { useActivateUser, useDeactivateUser, useUsersList } from '../hooks';

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

describe('useUsersList', () => {
  useMockBackend();

  it('returns envelope-parsed users and honors role + is_active filters', async () => {
    const seen: string[] = [];
    server.use(
      http.get('*/api/admin/users', ({ request }) => {
        seen.push(new URL(request.url).searchParams.toString());
        return HttpResponse.json({
          data: [
            {
              id: 1,
              email: 'a@example.com',
              name: 'A',
              role: 'admin',
              is_active: true,
              created_at: '2026-01-01T00:00:00Z',
            },
          ],
          pagination: { limit: 10, offset: 0, total: 1 },
        });
      }),
    );

    const { result } = renderHook(
      () =>
        useUsersList({ limit: 10, offset: 0, role: 'admin', is_active: true }),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(seen[0]).toContain('role=admin');
    expect(seen[0]).toContain('is_active=true');
    expect(seen[0]).toContain('envelope=1');
    expect(result.current.data?.data[0]?.email).toBe('a@example.com');
  });
});

describe('useActivateUser', () => {
  useMockBackend();

  it('issues PUT /users/:id/activate and resolves on 200', async () => {
    const seen: string[] = [];
    server.use(
      http.put('*/api/admin/users/:id/activate', ({ params }) => {
        seen.push(String(params.id));
        return HttpResponse.json({ status: 'activated' });
      }),
    );

    const { result } = renderHook(() => useActivateUser(), {
      wrapper: wrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync(42);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(seen).toEqual(['42']);
  });
});

describe('useDeactivateUser', () => {
  useMockBackend();

  it('succeeds on the default mock (non-admin target)', async () => {
    const { result } = renderHook(() => useDeactivateUser(), {
      wrapper: wrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync(2);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('surfaces the last_admin 409 as an ApiError the caller can special-case', async () => {
    server.use(
      http.put('*/api/admin/users/:id/deactivate', () =>
        HttpResponse.json(
          {
            error: {
              code: 'last_admin',
              message: 'Cannot remove the last active admin',
              type: 'invalid_request_error',
            },
          },
          { status: 409 },
        ),
      ),
    );
    const { result } = renderHook(() => useDeactivateUser(), {
      wrapper: wrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync(1).catch(() => void 0);
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    const err = result.current.error;
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('last_admin');
    expect((err as ApiError).status).toBe(409);
  });
});
