'use client';

import { Button, Dialog, Portal, Stack, Text } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormField, FormMoney } from '@/components/forms';
import { useHeldValue } from '@/lib/hooks/useHeldValue';

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
  /**
   * Prefill the (editable) model_id when creating a new row — used by the
   * "Add pricing" action next to a model that is serving traffic without a
   * pricing row. Ignored when `editing` is set.
   */
  prefillModelId?: string | undefined;
}

const EMPTY: PricingFormInput = {
  model_id: '',
  prompt_rate_per_mtok: '',
  completion_rate_per_mtok: '',
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
  prefillModelId,
}: PricingFormDialogProps) {
  const {
    register,
    control,
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
              prompt_rate_per_mtok: String(editing.prompt_rate_per_mtok),
              completion_rate_per_mtok: String(editing.completion_rate_per_mtok),
              typical_completion: String(editing.typical_completion),
            }
          : { ...EMPTY, model_id: prefillModelId ?? '' },
      );
    }
  }

  const submit = handleSubmit((values) => onSubmit(values));

  // The page nulls `editing` in the same update that closes the dialog. Hold
  // it so the title/locked-field don't swap to the "create" variant during the
  // exit animation (a visible flash). See useHeldValue.
  const editingShown = useHeldValue(isOpen, editing);

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
                <Dialog.Title>{editingShown ? 'Edit pricing' : 'New pricing'}</Dialog.Title>
                <Dialog.Description>
                  Rates are in USD per 1M tokens, stored to 6 decimal places.
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
                    autoFocus={!editingShown}
                    disabled={!!editingShown}
                    data-testid="pricing-model-id"
                  />
                  <FormMoney
                    name="prompt_rate_per_mtok"
                    label="Prompt rate (per 1M tokens)"
                    control={control}
                    storeUnit="dollars"
                    placeholder="0.20"
                    errorMessage={errors.prompt_rate_per_mtok?.message}
                    required
                    data-testid="pricing-prompt-rate"
                  />
                  <FormMoney
                    name="completion_rate_per_mtok"
                    label="Completion rate (per 1M tokens)"
                    control={control}
                    storeUnit="dollars"
                    placeholder="0.40"
                    errorMessage={errors.completion_rate_per_mtok?.message}
                    required
                    data-testid="pricing-completion-rate"
                  />
                  <FormField
                    name="typical_completion"
                    label="Typical completion (tokens)"
                    register={register}
                    type="number"
                    placeholder="500"
                    helperText="Used when reserving funds before a response lands."
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
                  {editingShown ? 'Save' : 'Create'}
                </Button>
              </Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
