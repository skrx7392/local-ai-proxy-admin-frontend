'use client';

import { Button, Dialog, Portal, Stack, Text } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormField } from '@/components/forms';

import {
  PricingFormSchema,
  type Pricing,
  type PricingFormInput,
  type PricingFormValues,
} from './schemas';

export interface PricingFormDialogProps {
  isOpen: boolean;
  editing: Pricing | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PricingFormValues) => void;
  isSubmitting?: boolean;
  submissionError?: string | undefined;
}

const EMPTY: PricingFormInput = {
  model_id: '',
  prompt_rate: '',
  completion_rate: '',
  typical_completion: '',
};

/**
 * Upsert dialog — same form used for create and edit. When `editing` is
 * set, the model_id field is locked (editing a row is really an upsert
 * keyed by model_id). When null, every field is editable.
 */
export function PricingFormDialog({
  isOpen,
  editing,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  submissionError,
}: PricingFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PricingFormInput, unknown, PricingFormValues>({
    resolver: zodResolver(PricingFormSchema),
    mode: 'onTouched',
    defaultValues: EMPTY,
  });

  // Reset / prefill on closed→open transition.
  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      reset(
        editing
          ? {
              model_id: editing.model_id,
              prompt_rate: String(editing.prompt_rate),
              completion_rate: String(editing.completion_rate),
              typical_completion: String(editing.typical_completion),
            }
          : EMPTY,
      );
    }
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
          <Dialog.Content data-testid="pricing-form-dialog">
            <form onSubmit={submit} noValidate>
              <Dialog.Header>
                <Dialog.Title>
                  {editing ? 'Edit pricing' : 'New pricing'}
                </Dialog.Title>
                <Dialog.Description>
                  Rates are dollars per token. To quote ${'${n}'}/1M tokens,
                  enter {'{'}n{'}'} / 1,000,000.
                </Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4">
                  <FormField
                    name="model_id"
                    label="Model ID"
                    register={register}
                    placeholder="e.g. llama3.1:8b"
                    errorMessage={errors.model_id?.message}
                    required
                    autoFocus={!editing}
                    disabled={!!editing}
                    data-testid="pricing-model-id"
                  />
                  <FormField
                    name="prompt_rate"
                    label="Prompt rate (USD/token)"
                    register={register}
                    type="number"
                    placeholder="0.00005"
                    errorMessage={errors.prompt_rate?.message}
                    required
                    data-testid="pricing-prompt-rate"
                  />
                  <FormField
                    name="completion_rate"
                    label="Completion rate (USD/token)"
                    register={register}
                    type="number"
                    placeholder="0.00015"
                    errorMessage={errors.completion_rate?.message}
                    required
                    data-testid="pricing-completion-rate"
                  />
                  <FormField
                    name="typical_completion"
                    label="Typical completion (tokens)"
                    register={register}
                    type="number"
                    placeholder="500"
                    helperText="Used when reserving credits before a response lands."
                    errorMessage={errors.typical_completion?.message}
                    data-testid="pricing-typical-completion"
                  />
                  {submissionError && (
                    <Text
                      role="alert"
                      color="red.500"
                      textStyle="body.sm"
                      data-testid="pricing-error"
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
                  data-testid="pricing-submit"
                >
                  {editing ? 'Save' : 'Create'}
                </Button>
              </Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
