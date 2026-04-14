'use client';

import { Field, Input } from '@chakra-ui/react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import type {
  FieldPath,
  FieldValues,
  UseFormRegister,
} from 'react-hook-form';

export interface FormFieldProps<TFieldValues extends FieldValues> {
  name: FieldPath<TFieldValues>;
  label: string;
  register: UseFormRegister<TFieldValues>;
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
  placeholder?: string;
  helperText?: ReactNode;
  errorMessage?: string | undefined;
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  'data-testid'?: string;
}

/**
 * Thin adapter that binds a react-hook-form field to Chakra's Field slot
 * recipe. Intentionally unopinionated about layout — callers compose it
 * with VStack / Stack.
 */
export function FormField<TFieldValues extends FieldValues>({
  name,
  label,
  register,
  type = 'text',
  placeholder,
  helperText,
  errorMessage,
  required = false,
  autoComplete,
  autoFocus,
  disabled,
  'data-testid': testId,
}: FormFieldProps<TFieldValues>) {
  const invalid = Boolean(errorMessage);
  return (
    <Field.Root invalid={invalid} required={required} disabled={disabled}>
      <Field.Label>{label}</Field.Label>
      <Input
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        data-testid={testId}
        {...register(name)}
      />
      {helperText && !invalid && <Field.HelperText>{helperText}</Field.HelperText>}
      {invalid && <Field.ErrorText>{errorMessage}</Field.ErrorText>}
    </Field.Root>
  );
}
