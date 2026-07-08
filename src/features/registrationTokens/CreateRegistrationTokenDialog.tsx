'use client';

import {
  Button,
  Dialog,
  Field,
  HStack,
  Input,
  Portal,
  Stack,
  Text,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { FormField, FormMoney } from '@/components/forms';

import {
  EXPIRY_PRESETS,
  EXPIRY_PRESET_LABELS,
  dateToLocalInput,
  resolveExpiryIso,
  type ExpiryPreset,
} from './expiry';
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
  expiry_preset: 'never',
  expiry_custom: '',
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
    setValue,
    clearErrors,
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

  const expiryPreset = useWatch({ control, name: 'expiry_preset' });
  const expiryCustom = useWatch({ control, name: 'expiry_custom' }) ?? '';

  function selectExpiryPreset(preset: ExpiryPreset): void {
    setValue('expiry_preset', preset, { shouldDirty: true });
    // A stale "custom" validation error must not linger once the user
    // switches to a preset that can't be invalid.
    if (preset !== 'custom') clearErrors('expiry_custom');
  }

  // Preview of the resolved expiry, shown in local time before submit.
  // Recomputed per render; the authoritative value is resolved by the
  // schema at submit time.
  const resolvedExpiry = resolveExpiryIso(expiryPreset, expiryCustom);
  const expiryPreview =
    expiryPreset === 'never'
      ? 'This token never expires.'
      : resolvedExpiry !== undefined
        ? `Expires ${format(new Date(resolvedExpiry), 'MMM d, yyyy, h:mm a')} local`
        : 'Pick a date and time to see the expiry.';

  const expiryInvalid = Boolean(errors.expiry_custom);

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
                  <Field.Root invalid={expiryInvalid}>
                    <Field.Label>Expires</Field.Label>
                    <HStack
                      gap="2"
                      wrap="wrap"
                      data-testid="regtoken-expiry-presets"
                    >
                      {EXPIRY_PRESETS.map((preset) => (
                        <Button
                          key={preset}
                          type="button"
                          size="sm"
                          variant={expiryPreset === preset ? 'solid' : 'outline'}
                          onClick={() => selectExpiryPreset(preset)}
                          data-testid={`regtoken-expiry-${preset}`}
                        >
                          {EXPIRY_PRESET_LABELS[preset]}
                        </Button>
                      ))}
                    </HStack>
                    {expiryPreset === 'custom' && (
                      <Input
                        type="datetime-local"
                        min={dateToLocalInput(new Date())}
                        data-testid="regtoken-expiry-custom-input"
                        {...register('expiry_custom')}
                      />
                    )}
                    {!expiryInvalid && (
                      <Field.HelperText data-testid="regtoken-expiry-preview">
                        {expiryPreview}
                      </Field.HelperText>
                    )}
                    {expiryInvalid && (
                      <Field.ErrorText data-testid="regtoken-expiry-error">
                        {errors.expiry_custom?.message}
                      </Field.ErrorText>
                    )}
                  </Field.Root>
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
