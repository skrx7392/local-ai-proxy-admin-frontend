'use client';

import { Button, Dialog, Portal, Stack, Text } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormField } from '@/components/forms';

import {
  CreateKeyFormSchema,
  type CreateKeyFormInput,
  type CreateKeyFormValues,
} from './schemas';

export interface CreateKeyDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateKeyFormValues) => void;
  isSubmitting?: boolean;
  submissionError?: string | undefined;
}

export function CreateKeyDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  submissionError,
}: CreateKeyDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateKeyFormInput, unknown, CreateKeyFormValues>({
    resolver: zodResolver(CreateKeyFormSchema),
    mode: 'onTouched',
    defaultValues: { name: '', rate_limit: '' },
  });

  // Reset the form on each closed→open transition so a prior cancel
  // doesn't leave stale state in the next open cycle. Using the "reset
  // state on prop change" pattern (React docs) instead of useEffect.
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
          <Dialog.Content data-testid="create-key-dialog">
            <form onSubmit={submit} noValidate>
              <Dialog.Header>
                <Dialog.Title>Create API key</Dialog.Title>
                <Dialog.Description>
                  Keys inherit the requesting user&apos;s rate limit unless
                  you specify one.
                </Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4">
                  <FormField
                    name="name"
                    label="Name"
                    register={register}
                    placeholder="e.g. frontend-dev"
                    helperText="Shown in the admin console. Not sent to upstream models."
                    errorMessage={errors.name?.message}
                    required
                    autoFocus
                    data-testid="create-key-name"
                  />
                  <FormField
                    name="rate_limit"
                    label="Rate limit (req/min)"
                    register={register}
                    type="number"
                    placeholder="60"
                    helperText="Leave blank to inherit the user default."
                    errorMessage={errors.rate_limit?.message}
                    data-testid="create-key-rate-limit"
                  />
                  {submissionError && (
                    <Text
                      role="alert"
                      color="red.500"
                      textStyle="body.sm"
                      data-testid="create-key-error"
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
                  data-testid="create-key-submit"
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
