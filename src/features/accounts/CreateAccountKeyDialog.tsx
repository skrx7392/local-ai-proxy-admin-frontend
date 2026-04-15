'use client';

import { Button, Dialog, Portal, Stack, Text } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormField } from '@/components/forms';

import {
  AccountKeyFormSchema,
  type AccountKeyFormInput,
  type AccountKeyFormValues,
} from './schemas';

export interface CreateAccountKeyDialogProps {
  isOpen: boolean;
  accountName: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AccountKeyFormValues) => void;
  isSubmitting?: boolean;
  submissionError?: string | undefined;
}

export function CreateAccountKeyDialog({
  isOpen,
  accountName,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  submissionError,
}: CreateAccountKeyDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountKeyFormInput, unknown, AccountKeyFormValues>({
    resolver: zodResolver(AccountKeyFormSchema),
    mode: 'onTouched',
    defaultValues: { name: '', rate_limit: '' },
  });

  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) reset({ name: '', rate_limit: '' });
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
          <Dialog.Content data-testid="create-account-key-dialog">
            <form onSubmit={submit} noValidate>
              <Dialog.Header>
                <Dialog.Title>Create account-scoped key</Dialog.Title>
                <Dialog.Description>
                  {accountName
                    ? `The key charges against ${accountName}'s credit balance.`
                    : 'The key charges against this account.'}
                </Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4">
                  <FormField
                    name="name"
                    label="Name"
                    register={register}
                    placeholder="e.g. batch-worker"
                    errorMessage={errors.name?.message}
                    required
                    autoFocus
                    data-testid="account-key-name"
                  />
                  <FormField
                    name="rate_limit"
                    label="Rate limit (req/min)"
                    register={register}
                    type="number"
                    placeholder="60"
                    helperText="Leave blank to inherit the account default."
                    errorMessage={errors.rate_limit?.message}
                    data-testid="account-key-rate-limit"
                  />
                  {submissionError && (
                    <Text
                      role="alert"
                      color="red.500"
                      textStyle="body.sm"
                      data-testid="account-key-error"
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
                  data-testid="account-key-submit"
                >
                  Create
                </Button>
              </Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
