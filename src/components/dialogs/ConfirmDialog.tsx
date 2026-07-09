'use client';

import { Button, Dialog, Portal, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';

import { useHeldValue } from '@/lib/hooks/useHeldValue';

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
  // Callers derive `title`/`description` from the row being acted on and null
  // that row in the same update that closes the dialog. Hold the last values
  // so the body doesn't blank out during the exit animation. See useHeldValue.
  const heldTitle = useHeldValue(isOpen, title);
  const heldDescription = useHeldValue(isOpen, description);

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
              <Dialog.Title>{heldTitle}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {typeof heldDescription === 'string' ? (
                <Text textStyle="body.sm" color="fg.muted">
                  {heldDescription}
                </Text>
              ) : (
                heldDescription
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
