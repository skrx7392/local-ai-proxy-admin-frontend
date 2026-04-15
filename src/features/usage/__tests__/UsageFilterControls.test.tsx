import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { system } from '@/theme';
import type { UrlPatch } from '@/lib/url/listState';

import { UsageFilterControls } from '../UsageFilterControls';
import { quickPickRange } from '../filters';

function wrap(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

describe('UsageFilterControls', () => {
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

  it('silently drops malformed IDs instead of firing a bad request', () => {
    const onChange = vi.fn();
    wrap(
      <UsageFilterControls filters={baseFilters} onChange={onChange} />,
    );
    fireEvent.click(screen.getByTestId('usage-filter-advanced-toggle'));

    const field = screen.getByTestId('usage-filter-account-id');
    fireEvent.change(field, { target: { value: 'abc' } });
    fireEvent.blur(field);

    expect(onChange).not.toHaveBeenCalled();
  });
});
