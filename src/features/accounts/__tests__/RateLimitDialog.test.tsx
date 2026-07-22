import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { system } from '@/theme';

import { RateLimitDialog } from '../RateLimitDialog';
import type { Account } from '../schemas';

const endUserAccount: Account = {
  id: 503,
  name: 'enduser@example.com',
  type: 'end_user',
  is_active: true,
  balance: 0,
  reserved: 0,
  available: 0,
  created_at: '2026-06-02T00:00:00Z',
  allowance_managed: true,
  monthly_grant: null,
  effective_monthly_grant: 5,
  email: 'enduser@example.com',
  rate_limit_per_min: null,
  effective_rate_limit_per_min: 30,
};

function wrap(overrides: Partial<Parameters<typeof RateLimitDialog>[0]> = {}) {
  const onSubmit = vi.fn();
  const onUseDefault = vi.fn();
  render(
    <ChakraProvider value={system}>
      <RateLimitDialog
        isOpen
        account={endUserAccount}
        onOpenChange={() => {}}
        onSubmit={onSubmit}
        onUseDefault={onUseDefault}
        {...overrides}
      />
    </ChakraProvider>,
  );
  return { onSubmit, onUseDefault };
}

describe('RateLimitDialog', () => {
  it('shows the current effective limit with a default marker', async () => {
    wrap();
    await waitFor(() =>
      expect(screen.getByTestId('ratelimit-dialog')).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/Currently 30 req\/min \(default\)/),
    ).toBeInTheDocument();
  });

  it('submits a valid integer override', async () => {
    const { onSubmit } = wrap();
    fireEvent.change(screen.getByTestId('ratelimit-amount'), {
      target: { value: '45' },
    });
    fireEvent.click(screen.getByTestId('ratelimit-submit'));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ rate_limit_per_min: 45 }),
    );
  });

  it('rejects zero client-side (blocking is deactivation, not a 429)', async () => {
    const { onSubmit } = wrap();
    fireEvent.change(screen.getByTestId('ratelimit-amount'), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByTestId('ratelimit-submit'));
    await waitFor(() =>
      expect(
        screen.getByText('Rate limit must be at least 1'),
      ).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects non-integer values', async () => {
    const { onSubmit } = wrap();
    fireEvent.change(screen.getByTestId('ratelimit-amount'), {
      target: { value: '2.5' },
    });
    fireEvent.click(screen.getByTestId('ratelimit-submit'));
    await waitFor(() =>
      expect(
        screen.getByText('Rate limit must be an integer'),
      ).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('routes "Use default" to the explicit clear action', async () => {
    const { onSubmit, onUseDefault } = wrap();
    fireEvent.click(screen.getByTestId('ratelimit-use-default'));
    await waitFor(() => expect(onUseDefault).toHaveBeenCalled());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
