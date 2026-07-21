'use client';

import { Button, Dialog, Portal, Stack } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormField, FormMoney } from '@/components/forms';
import { useHeldValue } from '@/lib/hooks/useHeldValue';

import {
  TopUpFormSchema,
  type TopUpFormInput,
  type TopUpFormValues,
} from './schemas';

export interface TopUpDialogProps {
  isOpen: boolean;
  /** Who is being topped up — email or account name. */
  who: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TopUpFormValues) => void;
  isSubmitting?: boolean;
}

// Top-up dialog for a pending credit request. Deliberately NOT the general
// GrantCreditsDialog: that form accepts negative amounts (claw-back), which
// in this flow would mark the request granted and then deduct from an
// already-exhausted account. Positive-only, with reset-scoped copy.
export function TopUpDialog({
  isOpen,
  who,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: TopUpDialogProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TopUpFormInput, unknown, TopUpFormValues>({
    resolver: zodResolver(TopUpFormSchema),
    mode: 'onTouched',
    defaultValues: { amount: '', description: '' },
  });

  // Reset on closed→open transition (React "reset state on prop change").
  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) reset({ amount: '', description: '' });
  }

  const submit = handleSubmit((values) => onSubmit(values));
  const whoShown = useHeldValue(isOpen, who);

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(details: { open: boolean }) => onOpenChange(details.open)}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content data-testid="topup-dialog">
            <form onSubmit={submit} noValidate>
              <Dialog.Header>
                <Dialog.Title>Top up this month</Dialog.Title>
                <Dialog.Description>
                  {whoShown
                    ? `Give ${whoShown} extra credits for the rest of this month.`
                    : 'Give this account extra credits for the rest of this month.'}{' '}
                  The top-up expires at the next monthly reset.
                </Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4">
                  <FormMoney
                    name="amount"
                    label="Amount"
                    control={control}
                    storeUnit="dollars"
                    helperText="Positive amounts only."
                    errorMessage={errors.amount?.message}
                    required
                    data-testid="topup-amount"
                  />
                  <FormField
                    name="description"
                    label="Description"
                    register={register}
                    placeholder="e.g. requested more credits"
                    helperText="Recorded in the ledger alongside this entry."
                    errorMessage={errors.description?.message}
                    data-testid="topup-description"
                  />
                </Stack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  colorPalette="accent"
                  loading={isSubmitting}
                  data-testid="topup-submit"
                >
                  Top up
                </Button>
              </Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
