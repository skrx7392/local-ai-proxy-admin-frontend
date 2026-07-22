'use client';

import { Button, Dialog, Portal, Stack, Text } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormField } from '@/components/forms';
import { useHeldValue } from '@/lib/hooks/useHeldValue';

import {
  RateLimitFormSchema,
  type Account,
  type RateLimitFormInput,
  type RateLimitFormValues,
} from './schemas';

export interface RateLimitDialogProps {
  isOpen: boolean;
  account: Account | null;
  onOpenChange: (open: boolean) => void;
  /** Set a per-account override (number) — "Apply". */
  onSubmit: (values: RateLimitFormValues) => void;
  /** Clear the override back to the class env default — "Use default". */
  onUseDefault: () => void;
  isSubmitting?: boolean;
  submissionError?: string | undefined;
}

// Editor for an account's request rate limit
// (docs/design/per-account-rate-limiting.md §4.3). Unlike the allowance,
// overrides take effect on the account's very next request. Blocking an
// account is NOT done here (no 0) — deactivate it instead.
export function RateLimitDialog({
  isOpen,
  account,
  onOpenChange,
  onSubmit,
  onUseDefault,
  isSubmitting = false,
  submissionError,
}: RateLimitDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RateLimitFormInput, unknown, RateLimitFormValues>({
    resolver: zodResolver(RateLimitFormSchema),
    mode: 'onTouched',
    defaultValues: { rate_limit_per_min: '' },
  });

  // Reset on closed→open transition (React "reset state on prop change").
  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      reset({ rate_limit_per_min: account?.rate_limit_per_min ?? '' });
    }
  }

  const submit = handleSubmit((values) => onSubmit(values));
  const accountShown = useHeldValue(isOpen, account);

  const current = accountShown
    ? `${accountShown.effective_rate_limit_per_min} req/min${
        accountShown.rate_limit_per_min === null ? ' (default)' : ' (override)'
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
          <Dialog.Content data-testid="ratelimit-dialog">
            <form onSubmit={submit} noValidate>
              <Dialog.Header>
                <Dialog.Title>Request rate limit</Dialog.Title>
                <Dialog.Description>
                  {accountShown
                    ? `Set the request rate limit for ${accountShown.name}.`
                    : 'Set the request rate limit for this account.'}
                  {current ? ` Currently ${current}.` : ''}
                </Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4">
                  <FormField
                    name="rate_limit_per_min"
                    label="Requests per minute"
                    register={register}
                    type="number"
                    placeholder="30"
                    helperText="Takes effect on the account's next request. To block an account, deactivate it instead."
                    errorMessage={errors.rate_limit_per_min?.message}
                    required
                    data-testid="ratelimit-amount"
                  />
                  {submissionError && (
                    <Text
                      role="alert"
                      color="red.500"
                      textStyle="body.sm"
                      data-testid="ratelimit-error"
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
                  data-testid="ratelimit-use-default"
                >
                  Use default
                </Button>
                <Button
                  type="submit"
                  colorPalette="accent"
                  loading={isSubmitting}
                  data-testid="ratelimit-submit"
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
