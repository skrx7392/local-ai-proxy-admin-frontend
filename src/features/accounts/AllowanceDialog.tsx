'use client';

import { Button, Dialog, Portal, Stack, Text } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormMoney } from '@/components/forms';
import { useHeldValue } from '@/lib/hooks/useHeldValue';

import {
  AllowanceFormSchema,
  type Account,
  type AllowanceFormInput,
  type AllowanceFormValues,
} from './schemas';

export interface AllowanceDialogProps {
  isOpen: boolean;
  account: Account | null;
  onOpenChange: (open: boolean) => void;
  /** Set a per-account override (number) — "Apply". */
  onSubmit: (values: AllowanceFormValues) => void;
  /** Clear the override back to the env default — "Use default". */
  onUseDefault: () => void;
  isSubmitting?: boolean;
  submissionError?: string | undefined;
}

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

// Editor for an end-user account's monthly allowance
// (docs/design/credit-requests.md §6). Overrides take effect at the next
// monthly reset — mid-month headroom is a credit grant, not an allowance
// change, which is why this dialog doesn't touch the balance.
export function AllowanceDialog({
  isOpen,
  account,
  onOpenChange,
  onSubmit,
  onUseDefault,
  isSubmitting = false,
  submissionError,
}: AllowanceDialogProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AllowanceFormInput, unknown, AllowanceFormValues>({
    resolver: zodResolver(AllowanceFormSchema),
    mode: 'onTouched',
    defaultValues: { monthly_grant: '' },
  });

  // Reset on closed→open transition (React "reset state on prop change").
  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      reset({ monthly_grant: account?.monthly_grant ?? '' });
    }
  }

  const submit = handleSubmit((values) => onSubmit(values));
  const accountShown = useHeldValue(isOpen, account);

  const current =
    accountShown?.effective_monthly_grant != null
      ? `${money.format(accountShown.effective_monthly_grant)}/mo${
          accountShown.monthly_grant === null ? ' (default)' : ' (override)'
        }`
      : null;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(details: { open: boolean }) => onOpenChange(details.open)}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content data-testid="allowance-dialog">
            <form onSubmit={submit} noValidate>
              <Dialog.Header>
                <Dialog.Title>Monthly allowance</Dialog.Title>
                <Dialog.Description>
                  {accountShown
                    ? `Set the monthly allowance for ${accountShown.name}.`
                    : 'Set the monthly allowance for this account.'}
                  {current ? ` Currently ${current}.` : ''}
                </Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4">
                  <FormMoney
                    name="monthly_grant"
                    label="Allowance per month"
                    control={control}
                    storeUnit="dollars"
                    helperText="Takes effect at the next monthly reset. 0 blocks the account."
                    errorMessage={errors.monthly_grant?.message}
                    required
                    data-testid="allowance-amount"
                  />
                  {submissionError && (
                    <Text
                      role="alert"
                      color="red.500"
                      textStyle="body.sm"
                      data-testid="allowance-error"
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
                  type="button"
                  variant="outline"
                  onClick={onUseDefault}
                  disabled={isSubmitting}
                  data-testid="allowance-use-default"
                >
                  Use default
                </Button>
                <Button
                  type="submit"
                  colorPalette="accent"
                  loading={isSubmitting}
                  data-testid="allowance-submit"
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
