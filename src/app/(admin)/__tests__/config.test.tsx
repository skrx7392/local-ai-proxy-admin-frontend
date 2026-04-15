import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { adminConfig } from '@/test/msw/fixtures';
import { server } from '@/test/msw/server';
import { useMockBackend } from '@/test/msw/useMockBackend';
import { system } from '@/theme';

import ConfigPage from '../config/page';

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

describe('/config — grouped snapshot', () => {
  useMockBackend();

  it('renders every group and field from the snapshot', async () => {
    const { getByTestId, queryByTestId } = wrap(<ConfigPage />);

    await waitFor(() => {
      expect(queryByTestId('config-group-backend')).not.toBeNull();
    });

    expect(getByTestId('config-group-limits')).toBeTruthy();
    expect(getByTestId('config-group-observability')).toBeTruthy();
    expect(getByTestId('config-group-build')).toBeTruthy();

    expect(getByTestId('config-value-ollama_url').textContent).toBe(
      adminConfig.ollama_url,
    );
    expect(getByTestId('config-value-max_request_body_bytes').textContent)
      .toBe('50 MiB');
    expect(getByTestId('config-value-admin_session_duration_hours').textContent)
      .toBe('6 h');
    expect(getByTestId('config-value-version').textContent).toBe(
      adminConfig.version,
    );
  });

  it('renders an error alert when the backend returns a non-allowlisted status', async () => {
    server.use(
      http.get('*/api/admin/config', () =>
        HttpResponse.json(
          { error: { code: 'boom', message: 'boom' } },
          { status: 500 },
        ),
      ),
    );
    const { findByTestId } = wrap(<ConfigPage />);
    await findByTestId('config-error');
  });
});
