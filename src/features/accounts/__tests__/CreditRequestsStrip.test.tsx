import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { system } from '@/theme';
import { server } from '@/test/msw/server';
import { useMockBackend } from '@/test/msw/useMockBackend';

import { CreditRequestsStrip } from '../CreditRequestsStrip';

function wrap() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={client}>
        <CreditRequestsStrip />
      </QueryClientProvider>
    </ChakraProvider>,
  );
}

describe('CreditRequestsStrip', () => {
  useMockBackend();

  it('renders pending requests with spend context and actions', async () => {
    wrap();
    await waitFor(() =>
      expect(screen.getByTestId('credit-requests-strip')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('credit-request-71')).toBeInTheDocument();
    // Fixture: $5 grant, $0 balance → used $5.00 of $5.00/mo.
    expect(screen.getByText(/used \$5\.00 of \$5\.00\/mo/)).toBeInTheDocument();
    expect(screen.getByTestId('credit-request-topup-71')).toBeInTheDocument();
    expect(screen.getByTestId('credit-request-dismiss-71')).toBeInTheDocument();
  });

  it('renders nothing when there are no pending requests', async () => {
    server.use(
      http.get('*/api/admin/credit-requests', () =>
        HttpResponse.json({
          data: [],
          pagination: { limit: 25, offset: 0, total: 0 },
        }),
      ),
    );
    wrap();
    // Give the query a tick to settle, then assert absence.
    await waitFor(() =>
      expect(screen.queryByTestId('credit-requests-strip')).toBeNull(),
    );
  });

  it('dismisses a request via PUT with a console note', async () => {
    let body: unknown;
    server.use(
      http.put('*/api/admin/credit-requests/:id', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: { id: 71, status: 'dismissed' } });
      }),
    );
    wrap();
    await waitFor(() =>
      expect(screen.getByTestId('credit-request-dismiss-71')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('credit-request-dismiss-71'));
    await waitFor(() =>
      expect(body).toEqual({
        status: 'dismissed',
        note: 'dismissed via admin console',
      }),
    );
  });

  it('surfaces a strip-level error when an action is refused', async () => {
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
    wrap();
    await waitFor(() =>
      expect(screen.getByTestId('credit-request-dismiss-71')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('credit-request-dismiss-71'));
    await waitFor(() =>
      expect(screen.getByTestId('credit-requests-error')).toBeInTheDocument(),
    );
  });
});
