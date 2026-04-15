import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { adminHealthDegraded } from '@/test/msw/fixtures';
import { server } from '@/test/msw/server';
import { useMockBackend } from '@/test/msw/useMockBackend';
import { system } from '@/theme';

import { HealthIndicator } from '../HealthIndicator';

function wrap(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </ChakraProvider>,
  );
}

describe('<HealthIndicator />', () => {
  useMockBackend();

  it('shows a green dot when the backend is healthy', async () => {
    const { getByTestId } = wrap(<HealthIndicator />);
    await waitFor(() => {
      expect(getByTestId('topbar-health').getAttribute('data-health-tone')).toBe(
        'ok',
      );
    });
    expect(getByTestId('topbar-health').getAttribute('aria-label')).toBe(
      'Backend health: healthy',
    );
  });

  it('shows a yellow dot with a degraded label when any check fails', async () => {
    server.use(
      http.get('*/api/admin/health', () =>
        HttpResponse.json(adminHealthDegraded, { status: 503 }),
      ),
    );
    const { getByTestId } = wrap(<HealthIndicator />);
    await waitFor(() => {
      expect(getByTestId('topbar-health').getAttribute('data-health-tone')).toBe(
        'warn',
      );
    });
  });

  it('shows a red dot when the health endpoint is unreachable', async () => {
    server.use(
      http.get('*/api/admin/health', () =>
        HttpResponse.json(
          { error: { code: 'gateway_error', message: 'connection refused' } },
          { status: 502 },
        ),
      ),
    );
    const { getByTestId } = wrap(<HealthIndicator />);
    await waitFor(() => {
      expect(getByTestId('topbar-health').getAttribute('data-health-tone')).toBe(
        'error',
      );
    });
  });

  it('renders each check row in the popover when clicked', async () => {
    const { getByTestId, findByTestId } = wrap(<HealthIndicator />);
    await waitFor(() =>
      expect(getByTestId('topbar-health').getAttribute('data-health-tone')).toBe(
        'ok',
      ),
    );

    fireEvent.click(getByTestId('topbar-health'));

    await findByTestId('topbar-health-check-db');
    await findByTestId('topbar-health-check-ollama');
    await findByTestId('topbar-health-check-usage_writer');
  });
});
