import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { format } from 'date-fns';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { system } from '@/theme';

import { CreateRegistrationTokenDialog } from '../CreateRegistrationTokenDialog';
import { dateToLocalInput } from '../expiry';
import type { RegistrationTokenFormValues } from '../schemas';

// Only Date is faked — real timers keep react-hook-form's async resolver
// and testing-library's waitFor polling working normally.
const NOW = new Date('2026-07-08T12:00:00.000Z');

function wrap(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

function renderDialog() {
  const onSubmit = vi.fn<(values: RegistrationTokenFormValues) => void>();
  wrap(
    <CreateRegistrationTokenDialog
      isOpen
      onOpenChange={() => {}}
      onSubmit={onSubmit}
    />,
  );
  return onSubmit;
}

function fillRequiredFields() {
  fireEvent.change(screen.getByTestId('regtoken-name'), {
    target: { value: 'ops-onboarding' },
  });
  fireEvent.change(screen.getByTestId('regtoken-credit-grant'), {
    target: { value: '5' },
  });
}

async function submitAndGetValues(
  onSubmit: ReturnType<typeof renderDialog>,
): Promise<RegistrationTokenFormValues> {
  fireEvent.click(screen.getByTestId('regtoken-submit'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  const values = onSubmit.mock.calls[0]?.[0];
  if (!values) throw new Error('onSubmit was not called with values');
  return values;
}

describe('CreateRegistrationTokenDialog expiry picker', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('offers 24h / 7d / 30d / Never / Custom options and no raw ISO input', () => {
    renderDialog();
    for (const preset of ['24h', '7d', '30d', 'never', 'custom']) {
      expect(screen.getByTestId(`regtoken-expiry-${preset}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('regtoken-expires-at')).toBeNull();
    // Custom picker stays hidden until the Custom option is selected.
    expect(screen.queryByTestId('regtoken-expiry-custom-input')).toBeNull();
  });

  it('defaults to Never and omits expires_at', async () => {
    const onSubmit = renderDialog();
    fillRequiredFields();
    expect(screen.getByTestId('regtoken-expiry-preview')).toHaveTextContent(
      /never expires/i,
    );
    const values = await submitAndGetValues(onSubmit);
    expect(values.expires_at).toBeUndefined();
  });

  it.each([
    ['24h', '2026-07-09T12:00:00.000Z'],
    ['7d', '2026-07-15T12:00:00.000Z'],
    ['30d', '2026-08-07T12:00:00.000Z'],
  ])('preset %s emits now + duration as ISO 8601 UTC', async (preset, expected) => {
    const onSubmit = renderDialog();
    fillRequiredFields();
    fireEvent.click(screen.getByTestId(`regtoken-expiry-${preset}`));
    const values = await submitAndGetValues(onSubmit);
    expect(values.expires_at).toBe(expected);
  });

  it('shows the resolved expiry in local time before submit', () => {
    renderDialog();
    fireEvent.click(screen.getByTestId('regtoken-expiry-7d'));
    const expectedLocal = format(
      new Date('2026-07-15T12:00:00.000Z'),
      'MMM d, yyyy, h:mm a',
    );
    expect(screen.getByTestId('regtoken-expiry-preview')).toHaveTextContent(
      `Expires ${expectedLocal} local`,
    );
  });

  it('custom picker emits the picked local datetime as ISO 8601 UTC', async () => {
    const onSubmit = renderDialog();
    fillRequiredFields();
    fireEvent.click(screen.getByTestId('regtoken-expiry-custom'));
    const input = screen.getByTestId('regtoken-expiry-custom-input');
    const local = '2026-12-31T18:30';
    fireEvent.change(input, { target: { value: local } });

    const expectedIso = new Date(local).toISOString();
    expect(screen.getByTestId('regtoken-expiry-preview')).toHaveTextContent(
      `Expires ${format(new Date(local), 'MMM d, yyyy, h:mm a')} local`,
    );

    const values = await submitAndGetValues(onSubmit);
    expect(values.expires_at).toBe(expectedIso);
    expect(values.expires_at).toMatch(/Z$/);
  });

  it('custom picker cannot select a time before now (min attribute)', () => {
    renderDialog();
    fireEvent.click(screen.getByTestId('regtoken-expiry-custom'));
    expect(screen.getByTestId('regtoken-expiry-custom-input')).toHaveAttribute(
      'min',
      dateToLocalInput(NOW),
    );
  });

  it('rejects a custom expiry in the past and does not submit', async () => {
    const onSubmit = renderDialog();
    fillRequiredFields();
    fireEvent.click(screen.getByTestId('regtoken-expiry-custom'));
    fireEvent.change(screen.getByTestId('regtoken-expiry-custom-input'), {
      target: { value: '2020-01-01T00:00' },
    });
    fireEvent.click(screen.getByTestId('regtoken-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('regtoken-expiry-error')).toHaveTextContent(
        'Expiry must be in the future',
      ),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects an empty custom expiry and does not submit', async () => {
    const onSubmit = renderDialog();
    fillRequiredFields();
    fireEvent.click(screen.getByTestId('regtoken-expiry-custom'));
    fireEvent.click(screen.getByTestId('regtoken-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('regtoken-expiry-error')).toHaveTextContent(
        'Pick an expiry date and time',
      ),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears a custom expiry error when switching back to a preset', async () => {
    const onSubmit = renderDialog();
    fillRequiredFields();
    fireEvent.click(screen.getByTestId('regtoken-expiry-custom'));
    fireEvent.click(screen.getByTestId('regtoken-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('regtoken-expiry-error')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId('regtoken-expiry-never'));
    await waitFor(() =>
      expect(screen.queryByTestId('regtoken-expiry-error')).toBeNull(),
    );

    const values = await submitAndGetValues(onSubmit);
    expect(values.expires_at).toBeUndefined();
  });
});
