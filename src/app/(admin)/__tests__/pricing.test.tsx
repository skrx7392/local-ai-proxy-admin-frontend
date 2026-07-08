import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { server } from '@/test/msw/server';
import { useMockBackend } from '@/test/msw/useMockBackend';
import { system } from '@/theme';

import PricingPage from '../pricing/page';

// useListSearchParams needs the app-router hooks; NextLink works in jsdom.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/pricing',
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

describe('/pricing — archive confirmation', () => {
  useMockBackend();

  it('names the model and archives only after explicit confirmation', async () => {
    const deleted: string[] = [];
    server.use(
      http.delete('*/api/admin/pricing/:id', ({ params }) => {
        deleted.push(params.id as string);
        return HttpResponse.json({ status: 'deleted' });
      }),
    );
    const { findByTestId, findByText, getByTestId, queryByTestId } = wrap(
      <PricingPage />,
    );
    await findByTestId('pricing-delete-201');

    fireEvent.click(getByTestId('pricing-delete-201'));
    await findByTestId('confirm-dialog');
    // The dialog must name the specific model being archived.
    await findByText(/"llama3\.1:8b" will fall back to the default rate/);
    // Opening the dialog must not fire the mutation.
    expect(deleted).toHaveLength(0);

    fireEvent.click(getByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(deleted).toEqual(['201']));
    await waitFor(() => expect(queryByTestId('confirm-dialog')).toBeNull());
  });

  it('cancel closes the dialog without archiving', async () => {
    const deleted: string[] = [];
    server.use(
      http.delete('*/api/admin/pricing/:id', ({ params }) => {
        deleted.push(params.id as string);
        return HttpResponse.json({ status: 'deleted' });
      }),
    );
    const { findByTestId, getByTestId, queryByTestId } = wrap(<PricingPage />);
    await findByTestId('pricing-delete-201');

    fireEvent.click(getByTestId('pricing-delete-201'));
    await findByTestId('confirm-dialog');
    fireEvent.click(getByTestId('confirm-dialog-cancel'));

    await waitFor(() => expect(queryByTestId('confirm-dialog')).toBeNull());
    expect(deleted).toHaveLength(0);
  });
});
