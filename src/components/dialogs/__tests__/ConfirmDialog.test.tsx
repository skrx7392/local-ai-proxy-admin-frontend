import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from '../ConfirmDialog';
import { system } from '@/theme';

function wrap(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>);
}

describe('ConfirmDialog', () => {
  it('does not render the dialog content when closed', () => {
    wrap(
      <ConfirmDialog
        isOpen={false}
        onOpenChange={() => {}}
        title="Revoke key?"
        description="This cannot be undone."
        onConfirm={() => {}}
      />,
    );
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
  });

  it('renders title + description when open', () => {
    wrap(
      <ConfirmDialog
        isOpen
        onOpenChange={() => {}}
        title="Revoke key?"
        description="Requests using this key will start returning 401."
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByText('Revoke key?')).toBeInTheDocument();
    expect(
      screen.getByText('Requests using this key will start returning 401.'),
    ).toBeInTheDocument();
  });

  it('calls onConfirm when Confirm is clicked', () => {
    const onConfirm = vi.fn();
    wrap(
      <ConfirmDialog
        isOpen
        onOpenChange={() => {}}
        title="Revoke key?"
        description="desc"
        onConfirm={onConfirm}
      />,
    );
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('closes via onOpenChange(false) when Cancel is clicked', () => {
    const onOpenChange = vi.fn();
    wrap(
      <ConfirmDialog
        isOpen
        onOpenChange={onOpenChange}
        title="Revoke key?"
        description="desc"
        onConfirm={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables both buttons while isConfirming', () => {
    wrap(
      <ConfirmDialog
        isOpen
        onOpenChange={() => {}}
        title="Revoke key?"
        description="desc"
        onConfirm={() => {}}
        isConfirming
      />,
    );
    expect(screen.getByTestId('confirm-dialog-cancel')).toBeDisabled();
    // The Confirm button uses `loading` which sets aria-disabled; assert
    // via the loading indicator instead of the disabled attribute.
    const confirmBtn = screen.getByTestId('confirm-dialog-confirm');
    expect(confirmBtn).toHaveAttribute('data-loading');
  });
});
