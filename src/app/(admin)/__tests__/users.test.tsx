import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { users } from '@/test/msw/fixtures';
import { server } from '@/test/msw/server';
import { useMockBackend } from '@/test/msw/useMockBackend';
import { system } from '@/theme';

import UsersPage from '../users/page';

// useListSearchParams needs the app-router hooks; NextLink works in jsdom.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/users',
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

const LAST_ADMIN_HINT =
  'This is the last active admin. Promote another user to admin before deactivating this one.';

// Structural shape of a users fixture row (the fixture itself is `as const`,
// so its element type is a literal union we can't extend with new rows).
type UserFixture = {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

const secondAdmin: UserFixture = {
  id: 4,
  email: 'second-admin@kinvee.in',
  name: 'Second Admin',
  role: 'admin',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

/**
 * Serves GET /api/admin/users from a custom user set, honoring the same
 * role / is_active filters the real backend (and the default handler)
 * supports. Needed because the page issues both the list query and the
 * active-admin-count query (role=admin&is_active=true) against this route.
 * Returns a counter of how many admin-count requests were served so tests
 * can wait for the guard data to arrive.
 */
function serveUsers(list: readonly UserFixture[]): { adminCountRequests: () => number } {
  let adminCountRequests = 0;
  server.use(
    http.get('*/api/admin/users', ({ request }) => {
      const url = new URL(request.url);
      let filtered = [...list];
      const role = url.searchParams.get('role');
      if (role) filtered = filtered.filter((u) => u.role === role);
      const isActive = url.searchParams.get('is_active');
      if (isActive === 'true') filtered = filtered.filter((u) => u.is_active);
      if (isActive === 'false') filtered = filtered.filter((u) => !u.is_active);
      if (role === 'admin' && isActive === 'true') adminCountRequests += 1;
      const limit = Number(url.searchParams.get('limit') ?? '10');
      const offset = Number(url.searchParams.get('offset') ?? '0');
      return HttpResponse.json({
        data: filtered.slice(offset, offset + limit),
        pagination: { limit, offset, total: filtered.length },
      });
    }),
  );
  return { adminCountRequests: () => adminCountRequests };
}

describe('/users — last-admin lockout guard', () => {
  useMockBackend();

  it('disables Deactivate for the last active admin and explains why', async () => {
    // Default fixtures: exactly one active admin (id 1).
    const { findByTestId, getByTestId } = wrap(<UsersPage />);
    await findByTestId('user-deactivate-1');

    await waitFor(() => expect(getByTestId('user-deactivate-1')).toBeDisabled());
    expect(getByTestId('user-deactivate-1').getAttribute('title')).toBe(
      LAST_ADMIN_HINT,
    );
    // Regular active users stay actionable.
    expect(getByTestId('user-deactivate-2')).not.toBeDisabled();
    expect(getByTestId('user-deactivate-2').getAttribute('title')).toBeNull();
  });

  it('keeps Deactivate enabled for an admin when another active admin exists', async () => {
    const { adminCountRequests } = serveUsers([...users, secondAdmin]);
    const { findByTestId, getByTestId } = wrap(<UsersPage />);
    await findByTestId('user-deactivate-1');

    // Wait for the admin-count query so "enabled" is a real verdict, not
    // just the pre-data default.
    await waitFor(() => expect(adminCountRequests()).toBeGreaterThan(0));
    await waitFor(() =>
      expect(getByTestId('user-deactivate-1')).not.toBeDisabled(),
    );
    expect(getByTestId('user-deactivate-4')).not.toBeDisabled();
  });

  it('surfaces the backend last_admin rejection inside the dialog', async () => {
    // Simulate a stale admin count: the UI believes there are two active
    // admins, but the backend (the authority) rejects with 409 last_admin.
    serveUsers([...users, secondAdmin]);
    server.use(
      http.put('*/api/admin/users/1/deactivate', () =>
        HttpResponse.json(
          {
            error: {
              code: 'last_admin',
              type: 'invalid_request_error',
              message: 'Cannot remove the last active admin',
            },
          },
          { status: 409 },
        ),
      ),
    );
    const { findByTestId, getByTestId } = wrap(<UsersPage />);
    await findByTestId('user-deactivate-1');
    await waitFor(() =>
      expect(getByTestId('user-deactivate-1')).not.toBeDisabled(),
    );

    fireEvent.click(getByTestId('user-deactivate-1'));
    await findByTestId('confirm-dialog');
    fireEvent.click(getByTestId('confirm-dialog-confirm'));

    const error = await findByTestId('user-deactivate-error');
    expect(error.textContent).toContain('last active admin');
    // The dialog stays open so the operator sees why nothing happened.
    expect(getByTestId('confirm-dialog')).toBeInTheDocument();
  });
});

describe('/users — deactivate confirmation', () => {
  useMockBackend();

  it('names the user and deactivates only after explicit confirmation', async () => {
    let putCount = 0;
    server.use(
      http.put('*/api/admin/users/:id/deactivate', () => {
        putCount += 1;
        return HttpResponse.json({ status: 'deactivated' });
      }),
    );
    const { findByTestId, findByText, getByTestId, queryByTestId } = wrap(
      <UsersPage />,
    );
    await findByTestId('user-deactivate-2');

    fireEvent.click(getByTestId('user-deactivate-2'));
    await findByTestId('confirm-dialog');
    await findByText(/ops@kinvee\.in will immediately lose access/);
    // Opening the dialog must not fire the mutation.
    expect(putCount).toBe(0);

    fireEvent.click(getByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(putCount).toBe(1));
    await waitFor(() => expect(queryByTestId('confirm-dialog')).toBeNull());
  });

  it('cancel closes the dialog without deactivating', async () => {
    let putCount = 0;
    server.use(
      http.put('*/api/admin/users/:id/deactivate', () => {
        putCount += 1;
        return HttpResponse.json({ status: 'deactivated' });
      }),
    );
    const { findByTestId, getByTestId, queryByTestId } = wrap(<UsersPage />);
    await findByTestId('user-deactivate-2');

    fireEvent.click(getByTestId('user-deactivate-2'));
    await findByTestId('confirm-dialog');
    fireEvent.click(getByTestId('confirm-dialog-cancel'));

    await waitFor(() => expect(queryByTestId('confirm-dialog')).toBeNull());
    expect(putCount).toBe(0);
  });
});
