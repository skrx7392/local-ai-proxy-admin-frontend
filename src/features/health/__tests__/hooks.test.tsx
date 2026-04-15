import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { adminHealthDegraded, adminHealthOk } from '@/test/msw/fixtures';
import { server } from '@/test/msw/server';
import { useMockBackend } from '@/test/msw/useMockBackend';

import { useAdminHealth } from '../hooks';

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useAdminHealth', () => {
  useMockBackend();

  it('returns the parsed snapshot when the backend is healthy (200)', async () => {
    const { result } = renderHook(() => useAdminHealth(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('ok');
    expect(result.current.data?.checks.db?.status).toBe('ok');
  });

  it('still succeeds when backend returns 503 with a degraded body', async () => {
    server.use(
      http.get('*/api/admin/health', () =>
        HttpResponse.json(adminHealthDegraded, { status: 503 }),
      ),
    );
    const { result } = renderHook(() => useAdminHealth(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('degraded');
    expect(result.current.data?.checks.ollama?.error).toContain('timeout');
  });

  it('marks the query as error when the BFF returns an unexpected status', async () => {
    server.use(
      http.get('*/api/admin/health', () =>
        HttpResponse.json({ error: { code: 'kaboom', message: 'boom' } }, { status: 500 }),
      ),
    );
    const { result } = renderHook(() => useAdminHealth(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('leaves adminHealthOk unchanged (fixture sanity)', () => {
    expect(adminHealthOk.status).toBe('ok');
  });
});
