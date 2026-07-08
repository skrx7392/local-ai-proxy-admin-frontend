import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { configSourcedNodeError, nodes } from '@/test/msw/fixtures';
import { server } from '@/test/msw/server';
import { useMockBackend } from '@/test/msw/useMockBackend';
import { system } from '@/theme';

import NodesPage from '../nodes/page';

// useListSearchParams needs the app-router hooks; NextLink works in jsdom.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/nodes',
  useSearchParams: () => new URLSearchParams(),
}));

function wrap(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </ChakraProvider>,
  );
}

describe('/nodes — list', () => {
  useMockBackend();

  it('renders a row per node with health, source, and models', async () => {
    const { findByTestId, getByTestId } = wrap(<NodesPage />);

    await findByTestId('node-name-1');
    expect(getByTestId('node-name-1').textContent).toBe('workstation');
    expect(getByTestId('node-health-1').getAttribute('data-health')).toBe(
      'healthy',
    );
    expect(getByTestId('node-health-2').getAttribute('data-health')).toBe(
      'unhealthy',
    );
    // Unhealthy tooltip carries the last error + confirmed-down semantics.
    expect(getByTestId('node-health-2').getAttribute('title')).toContain(
      'connection refused',
    );
    expect(getByTestId('node-health-2').getAttribute('title')).toContain(
      'consecutive probe failures',
    );
    expect(getByTestId('node-health-3').getAttribute('data-health')).toBe(
      'unknown',
    );
    // Full model list lives in the tooltip; the cell is truncated.
    expect(getByTestId('node-models-1').getAttribute('title')).toBe(
      'llama3.1:8b, qwen3-coder:30b',
    );
    expect(getByTestId('node-source-3').textContent).toBe('config');
  });

  it('rows are not clickable, so they carry no hover/click affordance', async () => {
    // Nodes have no detail page. The rows must not pretend otherwise:
    // no data-interactive marker (which drives the recipe's hover +
    // pointer styling) and no tab stop.
    const { findByTestId, getAllByTestId } = wrap(<NodesPage />);
    await findByTestId('node-name-1');
    const rows = getAllByTestId('data-table-row');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.hasAttribute('data-interactive')).toBe(false);
      expect(row.getAttribute('tabindex')).toBeNull();
    }
  });

  it('links each node to the usage page filtered by node_id', async () => {
    const { findByTestId, getByTestId } = wrap(<NodesPage />);
    await findByTestId('node-name-1');
    expect(getByTestId('node-usage-1').getAttribute('href')).toBe(
      '/usage?node_id=1',
    );
  });

  it('disables Edit + Disable for config-sourced nodes and points at NODES_FILE', async () => {
    const { findByTestId, getByTestId } = wrap(<NodesPage />);
    await findByTestId('node-name-3');
    expect(getByTestId('node-edit-3')).toBeDisabled();
    expect(getByTestId('node-disable-3')).toBeDisabled();
    expect(getByTestId('node-edit-3').getAttribute('title')).toContain(
      'NODES_FILE',
    );
    // API-sourced rows stay actionable.
    expect(getByTestId('node-edit-1')).not.toBeDisabled();
    expect(getByTestId('node-disable-1')).not.toBeDisabled();
  });

  it('shows the zero-state when no nodes are configured', async () => {
    server.use(
      http.get('*/api/admin/nodes', () =>
        HttpResponse.json({
          data: [],
          pagination: { limit: 25, offset: 0, total: 0 },
        }),
      ),
    );
    const { findByText } = wrap(<NodesPage />);
    await findByText('No nodes configured');
  });
});

describe('/nodes — disable flow', () => {
  useMockBackend();

  it('confirms via dialog then DELETEs the node', async () => {
    let deleted: string | undefined;
    server.use(
      http.delete('*/api/admin/nodes/:id', ({ params }) => {
        deleted = params.id as string;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { findByTestId, getByTestId } = wrap(<NodesPage />);
    await findByTestId('node-disable-1');

    fireEvent.click(getByTestId('node-disable-1'));
    await findByTestId('confirm-dialog');
    fireEvent.click(getByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(deleted).toBe('1'));
  });
});

describe('/nodes — refresh flow', () => {
  useMockBackend();

  it('re-probes the node and updates the row with the returned live state', async () => {
    server.use(
      http.post('*/api/admin/nodes/2/refresh', () =>
        HttpResponse.json({
          data: {
            ...nodes[1],
            health: 'healthy',
            models: ['gpt-4o-mini'],
            last_checked_at: '2026-07-07T12:34:56Z',
          },
        }),
      ),
    );
    const { findByTestId, getByTestId } = wrap(<NodesPage />);
    await findByTestId('node-refresh-2');
    expect(getByTestId('node-health-2').getAttribute('data-health')).toBe(
      'unhealthy',
    );

    fireEvent.click(getByTestId('node-refresh-2'));

    await waitFor(() =>
      expect(getByTestId('node-health-2').getAttribute('data-health')).toBe(
        'healthy',
      ),
    );
  });
});

describe('/nodes — edit dialog (masked secret UX)', () => {
  useMockBackend();

  it('shows the masked value, defaults to Keep, and never prefills the input', async () => {
    const { findByTestId, getByTestId, getByText, queryByTestId } = wrap(
      <NodesPage />,
    );
    await findByTestId('node-edit-2');

    fireEvent.click(getByTestId('node-edit-2'));
    await findByTestId('node-form-dialog');

    // Masked value is display-only.
    getByText('Current: Bearer sk-…abcd');
    // Keep is the default → no input rendered, nothing to round-trip.
    expect(queryByTestId('node-auth-header')).toBeNull();

    // Replace reveals an empty input.
    fireEvent.click(getByTestId('node-auth-mode-replace'));
    const input = await findByTestId('node-auth-header');
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('submits keep without auth_header and clear with ""', async () => {
    const bodies: Record<string, unknown>[] = [];
    server.use(
      http.put('*/api/admin/nodes/1', async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ data: nodes[0] });
      }),
    );
    const { findByTestId, getByTestId } = wrap(<NodesPage />);
    await findByTestId('node-edit-1');

    // Keep (default): auth_header absent.
    fireEvent.click(getByTestId('node-edit-1'));
    await findByTestId('node-form-dialog');
    fireEvent.click(getByTestId('node-submit'));
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect('auth_header' in bodies[0]!).toBe(false);

    // Clear: auth_header === "".
    fireEvent.click(getByTestId('node-edit-1'));
    await findByTestId('node-form-dialog');
    fireEvent.click(getByTestId('node-auth-mode-clear'));
    fireEvent.click(getByTestId('node-submit'));
    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1]!.auth_header).toBe('');
  });

  it('surfaces the backend 409 message inside the dialog', async () => {
    server.use(
      http.put('*/api/admin/nodes/1', () =>
        HttpResponse.json(configSourcedNodeError, { status: 409 }),
      ),
    );
    const { findByTestId, getByTestId } = wrap(<NodesPage />);
    await findByTestId('node-edit-1');

    fireEvent.click(getByTestId('node-edit-1'));
    await findByTestId('node-form-dialog');
    fireEvent.click(getByTestId('node-submit'));

    const error = await findByTestId('node-form-error');
    expect(error.textContent).toContain('NODES_FILE');
  });
});

describe('/nodes — create flow', () => {
  useMockBackend();

  it('POSTs the new node and closes the dialog', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post('*/api/admin/nodes', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { data: { ...nodes[0], id: 9, name: 'gpu-box' } },
          { status: 201 },
        );
      }),
    );
    const { findByTestId, getByTestId, queryByTestId } = wrap(<NodesPage />);
    await findByTestId('node-create-button');

    fireEvent.click(getByTestId('node-create-button'));
    await findByTestId('node-form-dialog');

    fireEvent.change(getByTestId('node-name'), {
      target: { value: 'gpu-box' },
    });
    fireEvent.change(getByTestId('node-base-url'), {
      target: { value: 'http://gpu-box:11434' },
    });
    fireEvent.click(getByTestId('node-submit'));

    await waitFor(() =>
      expect(body).toEqual({
        name: 'gpu-box',
        base_url: 'http://gpu-box:11434',
        backend_type: 'ollama',
      }),
    );
    await waitFor(() => expect(queryByTestId('node-form-dialog')).toBeNull());
  });

  it('rejects a base_url ending in /v1 before hitting the network', async () => {
    const { findByTestId, getByTestId, findByText } = wrap(<NodesPage />);
    await findByTestId('node-create-button');

    fireEvent.click(getByTestId('node-create-button'));
    await findByTestId('node-form-dialog');

    fireEvent.change(getByTestId('node-name'), { target: { value: 'x' } });
    fireEvent.change(getByTestId('node-base-url'), {
      target: { value: 'http://host:8000/v1' },
    });
    fireEvent.click(getByTestId('node-submit'));

    await findByText(/Do not include the \/v1 segment/);
  });
});
