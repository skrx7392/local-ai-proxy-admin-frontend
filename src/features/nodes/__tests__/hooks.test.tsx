import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { qk } from '@/lib/query/keys';
import { configSourcedNodeError, nodes } from '@/test/msw/fixtures';
import { server } from '@/test/msw/server';
import { useMockBackend } from '@/test/msw/useMockBackend';

import {
  useCreateNode,
  useDeleteNode,
  useNodesList,
  useRefreshNode,
  useUpdateNode,
} from '../hooks';

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useNodesList', () => {
  useMockBackend();

  it('returns envelope-parsed nodes with live state', async () => {
    const { result } = renderHook(() => useNodesList({ limit: 10, offset: 0 }), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const rows = result.current.data?.data ?? [];
    expect(rows.map((n) => n.name)).toEqual(['workstation', 'cloud', 'default']);
    expect(rows[0]?.health).toBe('healthy');
    expect(rows[1]?.last_error).toContain('refused');
    expect(rows[2]?.source).toBe('config');
    expect(result.current.data?.pagination.total).toBe(3);
  });
});

describe('useCreateNode', () => {
  useMockBackend();

  it('POSTs the payload and returns the created node (initial health included)', async () => {
    let body: unknown;
    server.use(
      http.post('*/api/admin/nodes', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          { data: { ...nodes[0], id: 9, name: 'new-node' } },
          { status: 201 },
        );
      }),
    );
    const { result } = renderHook(() => useCreateNode(), {
      wrapper: wrapperFor(makeClient()),
    });
    const created = await act(async () =>
      result.current.mutateAsync({
        name: 'new-node',
        base_url: 'http://h:11434',
        backend_type: 'ollama',
        timeout_seconds: 900,
      }),
    );
    expect(body).toEqual({
      name: 'new-node',
      base_url: 'http://h:11434',
      backend_type: 'ollama',
      timeout_seconds: 900,
    });
    expect(created.name).toBe('new-node');
    expect(created.health).toBe('healthy');
  });

  it('surfaces a 409 name conflict as ApiError', async () => {
    server.use(
      http.post('*/api/admin/nodes', () =>
        HttpResponse.json(
          {
            error: {
              code: 'node_name_conflict',
              type: 'invalid_request_error',
              message: 'A node with this name already exists',
            },
          },
          { status: 409 },
        ),
      ),
    );
    const { result } = renderHook(() => useCreateNode(), {
      wrapper: wrapperFor(makeClient()),
    });
    await expect(
      act(async () =>
        result.current.mutateAsync({
          name: 'workstation',
          base_url: 'http://h:11434',
          backend_type: 'ollama',
        }),
      ),
    ).rejects.toMatchObject({ status: 409, code: 'node_name_conflict' });
  });
});

describe('useUpdateNode', () => {
  useMockBackend();

  it('PUTs the tri-state payload verbatim (keep omits auth_header)', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.put('*/api/admin/nodes/1', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: nodes[0] });
      }),
    );
    const { result } = renderHook(() => useUpdateNode(), {
      wrapper: wrapperFor(makeClient()),
    });
    await act(async () =>
      result.current.mutateAsync({
        id: 1,
        payload: {
          name: 'workstation',
          base_url: 'http://192.0.2.10:11434',
          backend_type: 'ollama',
          static_models: [],
          health_path: '',
          timeout_seconds: 0,
          enabled: true,
        },
      }),
    );
    expect(body).toBeDefined();
    expect('auth_header' in body!).toBe(false);
    expect(body!.static_models).toEqual([]);
    expect(body!.health_path).toBe('');
    expect(body!.timeout_seconds).toBe(0);
  });

  it('sends auth_header:"" for clear', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.put('*/api/admin/nodes/1', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: nodes[0] });
      }),
    );
    const { result } = renderHook(() => useUpdateNode(), {
      wrapper: wrapperFor(makeClient()),
    });
    await act(async () =>
      result.current.mutateAsync({
        id: 1,
        payload: {
          name: 'workstation',
          base_url: 'http://192.0.2.10:11434',
          backend_type: 'ollama',
          auth_header: '',
          static_models: [],
          health_path: '',
          timeout_seconds: 0,
          enabled: true,
        },
      }),
    );
    expect(body!.auth_header).toBe('');
  });

  it('maps a config-sourced 409 to ApiError with the backend message', async () => {
    const { result } = renderHook(() => useUpdateNode(), {
      wrapper: wrapperFor(makeClient()),
    });
    let caught: unknown;
    await act(async () => {
      try {
        await result.current.mutateAsync({
          id: 3,
          payload: {
            name: 'default',
            base_url: 'http://ollama.local:11434',
            backend_type: 'ollama',
            static_models: [],
            health_path: '',
            timeout_seconds: 0,
            enabled: true,
          },
        });
      } catch (err) {
        caught = err;
      }
    });
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(409);
    expect((caught as ApiError).code).toBe('config_sourced_node');
    expect((caught as ApiError).message).toBe(
      configSourcedNodeError.error.message,
    );
  });
});

describe('useDeleteNode', () => {
  useMockBackend();

  it('resolves on 204 for an api-sourced node', async () => {
    const { result } = renderHook(() => useDeleteNode(), {
      wrapper: wrapperFor(makeClient()),
    });
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('rejects with 409 for a config-sourced node', async () => {
    const { result } = renderHook(() => useDeleteNode(), {
      wrapper: wrapperFor(makeClient()),
    });
    await expect(
      act(async () => result.current.mutateAsync(3)),
    ).rejects.toMatchObject({ status: 409, code: 'config_sourced_node' });
  });
});

describe('useRefreshNode', () => {
  useMockBackend();

  it('returns the re-probed node and writes it through to cached lists', async () => {
    const client = makeClient();
    const wrapper = wrapperFor(client);

    // Seed the list cache first so the write-through has something to update.
    const list = renderHook(() => useNodesList({ limit: 10, offset: 0 }), {
      wrapper,
    });
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));

    const { result } = renderHook(() => useRefreshNode(), { wrapper });
    const refreshed = await act(async () => result.current.mutateAsync(2));

    expect(refreshed.id).toBe(2);
    expect(refreshed.health).toBe('healthy');
    expect(refreshed.last_error).toBeUndefined();

    const cached = client.getQueryData<{ data: { id: number; health: string }[] }>(
      qk.nodes.list({ limit: 10, offset: 0 }),
    );
    expect(cached?.data.find((n) => n.id === 2)?.health).toBe('healthy');
  });
});
