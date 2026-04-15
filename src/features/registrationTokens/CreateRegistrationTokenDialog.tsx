'use client';

import { Button, Dialog, Portal, Stack, Text } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormField, FormMoney } from '@/components/forms';

import {
  RegistrationTokenFormSchema,
  type RegistrationTokenFormInput,
  type RegistrationTokenFormValues,
} from './schemas';

export interface CreateRegistrationTokenDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: RegistrationTokenFormValues) => void;
  isSubmitting?: boolean;
  submissionError?: string | undefined;
}

const EMPTY: RegistrationTokenFormInput = {
  name: '',
  credit_grant: '',
  max_uses: '',
  expires_at: '',
};

export function CreateRegistrationTokenDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  submissionError,
}: CreateRegistrationTokenDialogProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<
    RegistrationTokenFormInput,
    unknown,
    RegistrationTokenFormValues
  >({
    resolver: zodResolver(RegistrationTokenFormSchema),
    mode: 'onTouched',
    defaultValues: EMPTY,
  });

  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) reset(EMPTY);
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
          <Dialog.Content data-testid="create-regtoken-dialog">
            <form onSubmit={submit} noValidate>
              <Dialog.Header>
                <Dialog.Title>Create registration token</Dialog.Title>
                <Dialog.Description>
                  A single-use or bounded-use link that creates new user
                  accounts with a starting credit balance.
                </Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4">
                  <FormField
                    name="name"
                    label="Name"
                    register={register}
                    placeholder="e.g. ops-onboarding"
                    errorMessage={errors.name?.message}
                    required
                    autoFocus
                    data-testid="regtoken-name"
                  />
                  <FormMoney
                    name="credit_grant"
                    label="Credit grant"
                    control={control}
                    storeUnit="dollars"
                    helperText="Credits added to each account created via this token."
                    errorMessage={errors.credit_grant?.message}
                    required
                    data-testid="regtoken-credit-grant"
                  />
                  <FormField
                    name="max_uses"
                    label="Max uses"
                    register={register}
                    type="number"
                    placeholder="1"
                    helperText="Leave blank to default to 1."
                    errorMessage={errors.max_uses?.message}
                    data-testid="regtoken-max-uses"
                  />
                  <FormField
                    name="expires_at"
                    label="Expires at (ISO 8601)"
                    register={register}
                    placeholder="2026-12-31T23:59:59Z"
                    helperText="Leave blank for no expiry."
                    errorMessage={errors.expires_at?.message}
                    data-testid="regtoken-expires-at"
                  />
                  {submissionError && (
                    <Text
                      role="alert"
                      color="red.500"
                      textStyle="body.sm"
                      data-testid="regtoken-error"
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
                  data-testid="regtoken-submit"
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
