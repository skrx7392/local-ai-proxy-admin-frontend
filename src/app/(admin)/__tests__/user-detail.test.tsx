import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { server } from '@/test/msw/server';
import { useMockBackend } from '@/test/msw/useMockBackend';
import { system } from '@/theme';

import UserDetailPage from '../users/[id]/page';

// The detail page only needs the dynamic route param.
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '999' }),
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

describe('/users/[id] — resource not found', () => {
  useMockBackend();

  it('renders "User not found" exactly once with distinct body copy and a styled back link', async () => {
    // The live backend echoes "User not found" as the 404 message — the page
    // must not render it a second time as the body (UX P2 2026-07-08).
    server.use(
      http.get('*/api/admin/users/999', () =>
        HttpResponse.json(
          {
            error: {
              code: 'not_found',
              type: 'invalid_request_error',
              message: 'User not found',
            },
          },
          { status: 404 },
        ),
      ),
    );

    const { findByTestId, getAllByText, getByText, getByTestId } = wrap(
      <UserDetailPage />,
    );

    await findByTestId('user-detail-error');

    expect(getAllByText('User not found')).toHaveLength(1);
    getByText(/No user with ID 999 exists/);

    const back = getByTestId('user-detail-error-back');
    expect(back.tagName).toBe('A');
    expect(back.getAttribute('href')).toBe('/users');
  });
});

describe('/users/[id] — profile badges hug their content', () => {
  useMockBackend();

  it('does not stretch the Status and Role badges to the full grid column', async () => {
    server.use(
      http.get('*/api/admin/users/999', () =>
        HttpResponse.json({
          data: {
            id: 999,
            email: 'detail@kinvee.in',
            name: 'Detail User',
            role: 'admin',
            is_active: true,
            account_id: 501,
            created_at: '2026-01-12T10:00:00Z',
            updated_at: '2026-02-01T10:00:00Z',
          },
        }),
      ),
    );

    const { findByTestId } = wrap(<UserDetailPage />);

    // align-self:flex-start keeps each badge at content width instead of
    // filling the flex column the Field wrapper lays them out in.
    const status = await findByTestId('user-detail-status');
    const role = await findByTestId('user-detail-role');
    expect(status.style.alignSelf).toBe('flex-start');
    expect(role.style.alignSelf).toBe('flex-start');
  });
});
