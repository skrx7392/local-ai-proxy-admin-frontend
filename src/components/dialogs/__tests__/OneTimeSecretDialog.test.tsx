import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OneTimeSecretDialog } from '../OneTimeSecretDialog';
import { system } from '@/theme';

function wrap(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

describe('OneTimeSecretDialog', () => {
  const writeText = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      clipboard: { writeText },
    });
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the secret when open', () => {
    wrap(
      <OneTimeSecretDialog
        isOpen
        secret="sk_live_abc123"
        title="API key created"
        description="Save this somewhere safe."
        onClose={() => {}}
      />,
    );
    expect(screen.getByTestId('one-time-secret-value')).toHaveTextContent(
      'sk_live_abc123',
    );
  });

  it('keeps the Done button disabled until the acknowledgement is checked', () => {
    wrap(
      <OneTimeSecretDialog
        isOpen
        secret="sk_live_abc123"
        title="API key created"
        description="desc"
        onClose={() => {}}
      />,
    );
    const done = screen.getByTestId('one-time-secret-done');
    expect(done).toBeDisabled();
    fireEvent.click(screen.getByTestId('one-time-secret-ack'));
    expect(done).not.toBeDisabled();
  });

  it('copies the secret to the clipboard when Copy is clicked', async () => {
    wrap(
      <OneTimeSecretDialog
        isOpen
        secret="sk_live_abc123"
        title="API key created"
        description="desc"
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('one-time-secret-copy'));
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('sk_live_abc123');
    });
  });

  it('calls onClose only after explicit Done — backdrop is not dismissable', () => {
    const onClose = vi.fn();
    wrap(
      <OneTimeSecretDialog
        isOpen
        secret="sk_live_abc123"
        title="API key created"
        description="desc"
        onClose={onClose}
      />,
    );
    // Acknowledge then Done.
    fireEvent.click(screen.getByTestId('one-time-secret-ack'));
    fireEvent.click(screen.getByTestId('one-time-secret-done'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('resets acknowledgement when a fresh secret arrives', () => {
    const { rerender } = wrap(
      <OneTimeSecretDialog
        isOpen
        secret="first-secret"
        title="t"
        description="d"
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('one-time-secret-ack'));
    expect(screen.getByTestId('one-time-secret-done')).not.toBeDisabled();

    rerender(
      <ChakraProvider value={system}>
        <OneTimeSecretDialog
          isOpen
          secret="second-secret"
          title="t"
          description="d"
          onClose={() => {}}
        />
      </ChakraProvider>,
    );
    expect(screen.getByTestId('one-time-secret-done')).toBeDisabled();
  });
});
