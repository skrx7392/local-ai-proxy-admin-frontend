'use client';

import { Field, NativeSelect } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

export interface FormSelectOption {
  value: string;
  label: string;
}

export interface FormSelectProps<TFieldValues extends FieldValues> {
  name: FieldPath<TFieldValues>;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<TFieldValues, any, any>;
  options: readonly FormSelectOption[];
  /** If set, rendered as the first disabled option for placeholder UX. */
  placeholder?: string;
  helperText?: ReactNode;
  errorMessage?: string | undefined;
  required?: boolean;
  disabled?: boolean;
  'data-testid'?: string;
}

/**
 * Uses `Controller` rather than `register` so the select value is always
 * the string we choose — avoids the <option value={undefined}> footgun.
 */
export function FormSelect<TFieldValues extends FieldValues>({
  name,
  label,
  control,
  options,
  placeholder,
  helperText,
  errorMessage,
  required = false,
  disabled,
  'data-testid': testId,
}: FormSelectProps<TFieldValues>) {
  const invalid = Boolean(errorMessage);
  return (
    <Field.Root invalid={invalid} required={required} disabled={disabled}>
      <Field.Label>{label}</Field.Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <NativeSelect.Root>
            <NativeSelect.Field
              value={(field.value ?? '') as string}
              onChange={(event) => field.onChange(event.target.value)}
              onBlur={field.onBlur}
              ref={field.ref}
              name={field.name}
              data-testid={testId}
            >
              {placeholder !== undefined && (
                <option value="" disabled>
                  {placeholder}
                </option>
              )}
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        )}
      />
      {helperText && !invalid && <Field.HelperText>{helperText}</Field.HelperText>}
      {invalid && <Field.ErrorText>{errorMessage}</Field.ErrorText>}
    </Field.Root>
  );
}
