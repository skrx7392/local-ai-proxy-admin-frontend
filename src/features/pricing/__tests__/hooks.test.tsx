import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { server } from '@/test/msw/server';
import { useMockBackend } from '@/test/msw/useMockBackend';

import {
  useDeletePricing,
  usePricingList,
  useUpsertPricing,
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

describe('usePricingList', () => {
  useMockBackend();

  it('returns envelope-parsed pricing rows in the per-MTok wire shape', async () => {
    const { result } = renderHook(
      () => usePricingList({ limit: 10, offset: 0 }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const first = result.current.data?.data[0];
    expect(first?.model_id).toBe('llama3.1:8b');
    expect(first?.prompt_rate_per_mtok).toBeCloseTo(50);
    expect(first?.completion_rate_per_mtok).toBeCloseTo(150);
    expect(first?.typical_completion).toBe(500);
    expect(first?.active).toBe(true);
  });
});

describe('useUpsertPricing', () => {
  useMockBackend();

  it('posts the renamed per-MTok fields (and nothing else) and invalidates the list', async () => {
    let body: unknown;
    server.use(
      http.post('*/api/admin/pricing', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ status: 'updated' });
      }),
    );
    const { result } = renderHook(() => useUpsertPricing(), {
      wrapper: wrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync({
        model_id: 'new-model',
        prompt_rate_per_mtok: 4000,
        completion_rate_per_mtok: 12000,
        typical_completion: 500,
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Exact match — the strict backend decoder 400s on ANY unknown key,
    // so the body must contain the new names and only the new names.
    expect(body).toEqual({
      model_id: 'new-model',
      prompt_rate_per_mtok: 4000,
      completion_rate_per_mtok: 12000,
      typical_completion: 500,
    });
    const keys = Object.keys(body as Record<string, unknown>);
    expect(keys).not.toContain('prompt_rate');
    expect(keys).not.toContain('completion_rate');
  });

  it('surfaces the 400 unknown_field error if a legacy field name slips through', async () => {
    // The default MSW handler mirrors the backend's strict JSON decoding.
    const { result } = renderHook(() => useUpsertPricing(), {
      wrapper: wrapper(),
    });
    await act(async () => {
      await result.current
        .mutateAsync({
          model_id: 'new-model',
          prompt_rate: 0.001,
          completion_rate: 0.002,
        } as never)
        .catch(() => undefined);
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useDeletePricing', () => {
  useMockBackend();

  it('resolves on a successful delete', async () => {
    const { result } = renderHook(() => useDeletePricing(), {
      wrapper: wrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync(201);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
