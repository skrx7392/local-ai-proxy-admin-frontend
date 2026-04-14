'use client';

import { Button, Dialog, Portal, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Marks the confirm button as destructive (red). Defaults to false. */
  destructive?: boolean;
  /** Called on explicit confirm. The dialog does NOT auto-close — leave that
   *  to the caller so it can stay open while the mutation is in flight. */
  onConfirm: () => void;
  /** While true, the confirm button is disabled + shows loading. */
  isConfirming?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  isConfirming = false,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(details: { open: boolean }) => onOpenChange(details.open)}
      role="alertdialog"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content data-testid="confirm-dialog">
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {typeof description === 'string' ? (
                <Text textStyle="body.sm" color="fg.muted">
                  {description}
                </Text>
              ) : (
                description
              )}
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isConfirming}
                data-testid="confirm-dialog-cancel"
              >
                {cancelLabel}
              </Button>
              <Button
                colorPalette={destructive ? 'red' : 'accent'}
                onClick={onConfirm}
                loading={isConfirming}
                data-testid="confirm-dialog-confirm"
              >
                {confirmLabel}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
