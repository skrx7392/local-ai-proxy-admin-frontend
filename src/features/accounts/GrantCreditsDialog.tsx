'use client';

import { Button, Dialog, Portal, Stack, Text } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormField, FormMoney } from '@/components/forms';

import {
  GrantCreditsFormSchema,
  type GrantCreditsFormInput,
  type GrantCreditsFormValues,
} from './schemas';

export interface GrantCreditsDialogProps {
  isOpen: boolean;
  accountName: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GrantCreditsFormValues) => void;
  isSubmitting?: boolean;
  submissionError?: string | undefined;
}

export function GrantCreditsDialog({
  isOpen,
  accountName,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  submissionError,
}: GrantCreditsDialogProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GrantCreditsFormInput, unknown, GrantCreditsFormValues>({
    resolver: zodResolver(GrantCreditsFormSchema),
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

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(details: { open: boolean }) => onOpenChange(details.open)}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content data-testid="grant-credits-dialog">
            <form onSubmit={submit} noValidate>
              <Dialog.Header>
                <Dialog.Title>Grant credits</Dialog.Title>
                <Dialog.Description>
                  {accountName
                    ? `Adjust the credit balance on ${accountName}. Use a negative amount to claw back.`
                    : 'Adjust the credit balance on this account.'}
                </Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4">
                  <FormMoney
                    name="amount"
                    label="Amount"
                    control={control}
                    storeUnit="dollars"
                    helperText="Positive to grant, negative to claw back."
                    errorMessage={errors.amount?.message}
                    required
                    data-testid="grant-amount"
                  />
                  <FormField
                    name="description"
                    label="Description"
                    register={register}
                    placeholder="e.g. quarterly top-up"
                    helperText="Recorded in the ledger alongside this entry."
                    errorMessage={errors.description?.message}
                    data-testid="grant-description"
                  />
                  {submissionError && (
                    <Text
                      role="alert"
                      color="red.500"
                      textStyle="body.sm"
                      data-testid="grant-error"
                    >
                      {submissionError}
                    </Text>
                  )}
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
                  data-testid="grant-submit"
                >
                  Apply
                </Button>
              </Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
