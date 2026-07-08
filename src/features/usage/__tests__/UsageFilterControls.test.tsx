import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { system } from '@/theme';
import type { UrlPatch } from '@/lib/url/listState';
import { useMockBackend } from '@/test/msw/useMockBackend';

import { UsageFilterControls } from '../UsageFilterControls';
import { quickPickRange } from '../filters';

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

describe('UsageFilterControls', () => {
  useMockBackend();

  const baseFilters = {
    since: '2026-04-13T00:00:00.000Z',
    until: '2026-04-14T00:00:00.000Z',
  };

  it('writes absolute ISO since/until when a quick pick is clicked', () => {
    const onChange = vi.fn<(patch: UrlPatch) => void>();
    wrap(<UsageFilterControls filters={baseFilters} onChange={onChange} />);

    fireEvent.click(screen.getByTestId('usage-quick-pick-24h'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const patch = onChange.mock.calls[0]?.[0] as UrlPatch;
    expect(typeof patch.since).toBe('string');
    expect(typeof patch.until).toBe('string');
    // ISO Z-suffix — not a relative "24h" token.
    expect(String(patch.since)).toMatch(/T.*Z$/);
    expect(String(patch.until)).toMatch(/T.*Z$/);
  });

  it('detects a quick-pick range and keeps the custom row collapsed', () => {
    const { since, until } = quickPickRange('7d');
    wrap(
      <UsageFilterControls
        filters={{ since, until }}
        onChange={() => undefined}
      />,
    );
    expect(screen.queryByTestId('usage-custom-range')).toBeNull();
  });

  it('opens the custom range row when the range is not a quick pick', () => {
    wrap(
      <UsageFilterControls
        filters={{
          since: '2026-04-13T00:00:00.000Z',
          until: '2026-04-13T07:12:00.000Z',
        }}
        onChange={() => undefined}
      />,
    );
    expect(screen.getByTestId('usage-custom-range')).toBeTruthy();
  });

  it('rejects a reversed custom range with a visible error and no emit', () => {
    const onChange = vi.fn();
    wrap(
      <UsageFilterControls
        filters={{
          // Not a quick-pick span — opens the custom range row by default.
          since: '2026-04-13T00:00:00.000Z',
          until: '2026-04-13T07:12:00.000Z',
        }}
        onChange={onChange}
      />,
    );
    const since = screen.getByTestId('usage-custom-since') as HTMLInputElement;
    const until = screen.getByTestId('usage-custom-until') as HTMLInputElement;
    fireEvent.change(since, { target: { value: '2026-04-14T10:00' } });
    fireEvent.change(until, { target: { value: '2026-04-13T10:00' } });
    fireEvent.click(screen.getByTestId('usage-custom-apply'));

    expect(screen.getByTestId('usage-custom-error')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('UsageFilterControls — entity pickers', () => {
  useMockBackend();

  const baseFilters = {
    since: '2026-04-13T00:00:00.000Z',
    until: '2026-04-14T00:00:00.000Z',
  };

  function openAdvanced() {
    fireEvent.click(screen.getByTestId('usage-filter-advanced-toggle'));
  }

  it('loads account options, filters them as the admin types, and applies the picked id', async () => {
    const onChange = vi.fn();
    wrap(<UsageFilterControls filters={baseFilters} onChange={onChange} />);
    openAdvanced();

    const input = screen.getByTestId('usage-filter-account-id');
    fireEvent.click(input);

    // Options come from GET /accounts (MSW fixtures) as "name (id)".
    expect(
      await screen.findByText('Default Admin Account (501)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Batch Pipeline (502)')).toBeInTheDocument();

    // Typing narrows the list client-side.
    fireEvent.change(input, { target: { value: 'batch' } });
    await waitFor(() =>
      expect(screen.queryByText('Default Admin Account (501)')).toBeNull(),
    );
    const option = screen.getByText('Batch Pipeline (502)');

    // Picking an option applies the numeric id, not the label.
    fireEvent.click(option);
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        { account_id: 502 },
        { resetOffset: true },
      ),
    );
  });

  it('shows the applied entity as "name (id)" when deep-linked by id', async () => {
    wrap(
      <UsageFilterControls
        filters={{ ...baseFilters, account_id: 502 }}
        onChange={() => undefined}
      />,
    );
    // Advanced panel auto-opens because a filter is applied; once the
    // accounts list arrives the raw id resolves to its label.
    const input = screen.getByTestId(
      'usage-filter-account-id',
    ) as HTMLInputElement;
    await waitFor(() => expect(input.value).toBe('Batch Pipeline (502)'));
  });

  it('clears the applied filter from the clear affordance', async () => {
    const onChange = vi.fn();
    wrap(
      <UsageFilterControls
        filters={{ ...baseFilters, account_id: 502 }}
        onChange={onChange}
      />,
    );
    const clear = await screen.findByTestId('usage-filter-account-id-clear');
    fireEvent.click(clear);
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        { account_id: null },
        { resetOffset: true },
      ),
    );
  });

  it('renders searchable pickers for all four entity filters', async () => {
    wrap(<UsageFilterControls filters={baseFilters} onChange={() => undefined} />);
    openAdvanced();

    for (const [testId, expected] of [
      ['usage-filter-api-key-id', 'frontend-dev (101)'],
      ['usage-filter-user-id', 'Krishna (1)'],
      ['usage-filter-node-id', 'workstation (1)'],
    ] as const) {
      const input = screen.getByTestId(testId);
      fireEvent.click(input);
      expect(await screen.findByText(expected)).toBeInTheDocument();
      // Close before probing the next picker so option text doesn't overlap.
      fireEvent.keyDown(input, { key: 'Escape' });
    }
  });

  it('does not emit a filter change for free text that matches no entity', async () => {
    const onChange = vi.fn();
    wrap(<UsageFilterControls filters={baseFilters} onChange={onChange} />);
    openAdvanced();

    const input = screen.getByTestId('usage-filter-account-id');
    fireEvent.click(input);
    await screen.findByText('Batch Pipeline (502)');
    fireEvent.change(input, { target: { value: 'no-such-account' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('UsageFilterControls — model filter', () => {
  useMockBackend();

  const baseFilters = {
    since: '2026-04-13T00:00:00.000Z',
    until: '2026-04-14T00:00:00.000Z',
  };

  it('offers the live deployed models discovered on nodes', async () => {
    const onChange = vi.fn();
    wrap(<UsageFilterControls filters={baseFilters} onChange={onChange} />);

    const input = screen.getByTestId('usage-filter-model');
    fireEvent.click(input);

    // Union of node.models + static_models from the /nodes fixtures.
    expect(await screen.findByText('llama3.1:8b')).toBeInTheDocument();
    expect(screen.getByText('qwen3-coder:30b')).toBeInTheDocument();
    expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument();

    fireEvent.click(screen.getByText('qwen3-coder:30b'));
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        { model: 'qwen3-coder:30b' },
        { resetOffset: true },
      ),
    );
  });

  it('still accepts a free-text model (historical, no longer deployed)', async () => {
    const onChange = vi.fn();
    wrap(<UsageFilterControls filters={baseFilters} onChange={onChange} />);

    const input = screen.getByTestId('usage-filter-model');
    fireEvent.change(input, { target: { value: 'retired-model:1b' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        { model: 'retired-model:1b' },
        { resetOffset: true },
      ),
    );
  });
});
