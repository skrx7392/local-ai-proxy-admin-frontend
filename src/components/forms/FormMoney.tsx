'use client';

import { Field, Group, Input, InputAddon } from '@chakra-ui/react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import type { ReactNode } from 'react';

export interface FormMoneyProps<TFieldValues extends FieldValues> {
  name: FieldPath<TFieldValues>;
  label: string;
  control: Control<TFieldValues>;
  /**
   * Render currency symbol as a leading addon. Default '$'. Purely visual —
   * the stored value is a raw integer (see storeUnit below).
   */
  currencySymbol?: string;
  /**
   * The unit the form value is stored in. 'cents' (default) = store the
   * integer count of cents; input displays as dollars.decimals and is
   * converted on change. 'dollars' = store decimals directly as a number.
   */
  storeUnit?: 'cents' | 'dollars';
  helperText?: ReactNode;
  errorMessage?: string | undefined;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  'data-testid'?: string;
}

function toDisplay(value: unknown, storeUnit: 'cents' | 'dollars'): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '';
  return storeUnit === 'cents' ? (n / 100).toFixed(2) : String(n);
}

function fromDisplay(display: string, storeUnit: 'cents' | 'dollars'): number | '' {
  if (display.trim() === '') return '';
  const parsed = Number(display);
  if (!Number.isFinite(parsed)) return '';
  return storeUnit === 'cents' ? Math.round(parsed * 100) : parsed;
}

/**
 * Money input that keeps the form value in a precise integer unit (cents
 * by default) while the user types decimals. Avoids floating-point drift
 * across round-trips to the backend.
 */
export function FormMoney<TFieldValues extends FieldValues>({
  name,
  label,
  control,
  currencySymbol = '$',
  storeUnit = 'cents',
  helperText,
  errorMessage,
  required = false,
  disabled,
  placeholder = '0.00',
  'data-testid': testId,
}: FormMoneyProps<TFieldValues>) {
  const invalid = Boolean(errorMessage);
  return (
    <Field.Root invalid={invalid} required={required} disabled={disabled}>
      <Field.Label>{label}</Field.Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Group attached width="100%">
            <InputAddon>{currencySymbol}</InputAddon>
            <Input
              type="text"
              inputMode="decimal"
              placeholder={placeholder}
              data-testid={testId}
              value={toDisplay(field.value, storeUnit)}
              onChange={(event) => {
                field.onChange(fromDisplay(event.target.value, storeUnit));
              }}
              onBlur={field.onBlur}
              ref={field.ref}
              name={field.name}
            />
          </Group>
        )}
      />
      {helperText && !invalid && <Field.HelperText>{helperText}</Field.HelperText>}
      {invalid && <Field.ErrorText>{errorMessage}</Field.ErrorText>}
    </Field.Root>
  );
}
