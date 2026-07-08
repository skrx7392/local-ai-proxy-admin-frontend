import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { server } from '@/test/msw/server';
import { useMockBackend } from '@/test/msw/useMockBackend';
import { system } from '@/theme';
import { formatAbsoluteTime } from '@/lib/utils/datetime';

import KeysPage from '../keys/page';

// useListSearchParams needs the app-router hooks; NextLink works in jsdom.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/keys',
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

describe('/keys — revoke confirmation', () => {
  useMockBackend();

  it('names the key and revokes only after explicit confirmation', async () => {
    const deleted: string[] = [];
    server.use(
      http.delete('*/api/admin/keys/:id', ({ params }) => {
        deleted.push(params.id as string);
        return HttpResponse.json({ status: 'revoked' });
      }),
    );
    const { findByTestId, findByText, getByTestId, queryByTestId } = wrap(
      <KeysPage />,
    );
    await findByTestId('key-revoke-101');

    fireEvent.click(getByTestId('key-revoke-101'));
    await findByTestId('confirm-dialog');
    // The dialog must name the specific key being revoked.
    await findByText(/"frontend-dev" will stop accepting requests/);
    // Opening the dialog must not fire the mutation.
    expect(deleted).toHaveLength(0);

    fireEvent.click(getByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(deleted).toEqual(['101']));
    await waitFor(() => expect(queryByTestId('confirm-dialog')).toBeNull());
  });

  it('cancel closes the dialog without revoking', async () => {
    const deleted: string[] = [];
    server.use(
      http.delete('*/api/admin/keys/:id', ({ params }) => {
        deleted.push(params.id as string);
        return HttpResponse.json({ status: 'revoked' });
      }),
    );
    const { findByTestId, getByTestId, queryByTestId } = wrap(<KeysPage />);
    await findByTestId('key-revoke-101');

    fireEvent.click(getByTestId('key-revoke-101'));
    await findByTestId('confirm-dialog');
    fireEvent.click(getByTestId('confirm-dialog-cancel'));

    await waitFor(() => expect(queryByTestId('confirm-dialog')).toBeNull());
    expect(deleted).toHaveLength(0);
  });
});

describe('/keys — last used column', () => {
  useMockBackend();

  it('renders relative time with the absolute value on hover', async () => {
    const { findByTestId } = wrap(<KeysPage />);

    // Key 101 has usage: relative text plus the absolute UTC value as a title.
    const used = await findByTestId('key-last-used-101');
    expect(used.textContent).not.toBe('Never');
    expect(used.textContent).toMatch(/ago|now/);
    expect(used).toHaveAttribute(
      'title',
      formatAbsoluteTime('2026-07-07T08:30:00Z'),
    );
  });

  it('renders "Never" (with no tooltip) for a key that was never used', async () => {
    const { findByTestId } = wrap(<KeysPage />);

    // Key 103 (revoked, no usage) → last_used_at is null.
    const never = await findByTestId('key-last-used-103');
    expect(never.textContent).toBe('Never');
    expect(never).not.toHaveAttribute('title');
  });
});
