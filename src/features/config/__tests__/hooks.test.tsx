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

  it('tolerates unknown fields from a newer backend (P0 2026-07-08)', async () => {
    // A backend that grew fields the FE doesn't know about yet must never
    // blank the page. Unknown keys are stripped by the schema, so they also
    // never reach the UI.
    server.use(
      http.get('*/api/admin/config', () =>
        HttpResponse.json({ ...adminConfig, admin_key: 'sk-leaked' }),
      ),
    );
    const { result } = renderHook(() => useAdminConfig(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.version).toBe(adminConfig.version);
    expect(
      result.current.data !== undefined && 'admin_key' in result.current.data,
    ).toBe(false);
  });

  it('errors (never hangs) when the API returns an HTTP-200 error envelope', async () => {
    server.use(
      http.get('*/api/admin/config', () =>
        HttpResponse.json({ code: 'csrf_check_failed' }),
      ),
    );
    const { result } = renderHook(() => useAdminConfig(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: 'csrf_check_failed' });
  });
});
