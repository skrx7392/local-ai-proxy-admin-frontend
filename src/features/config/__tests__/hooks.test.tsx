import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { adminConfig } from '@/test/msw/fixtures';
import { server } from '@/test/msw/server';
import { useMockBackend } from '@/test/msw/useMockBackend';

import { useAdminConfig } from '../hooks';

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useAdminConfig', () => {
  useMockBackend();

  it('returns the parsed snapshot from GET /admin/config', async () => {
    const { result } = renderHook(() => useAdminConfig(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.version).toBe(adminConfig.version);
    expect(result.current.data?.admin_session_duration_hours).toBe(6);
  });

  it('surfaces a zod error if the backend leaks an unknown field', async () => {
    server.use(
      http.get('*/api/admin/config', () =>
        HttpResponse.json({ ...adminConfig, admin_key: 'sk-leaked' }),
      ),
    );
    const { result } = renderHook(() => useAdminConfig(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
