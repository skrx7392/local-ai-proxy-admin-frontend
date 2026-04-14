import { z } from 'zod';

// Matches internal/admin/admin.go::keyResponse (list item). The field
// `revoked` is an inverse of "active" — backend accepts ?is_active=true|false
// as a filter parameter and maps it internally.
export const KeySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  key_prefix: z.string(),
  rate_limit: z.number().int().nonnegative(),
  created_at: z.string(),
  revoked: z.boolean(),
});

export type Key = z.infer<typeof KeySchema>;

// Matches internal/admin/admin.go::createKeyResponse. The plaintext
// material is returned in the `key` field, NOT `plaintext_key` — that
// was a frontend misconception corrected in this PR.
export const CreatedKeySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  key: z.string().min(16),
  key_prefix: z.string(),
  rate_limit: z.number().int().nonnegative(),
});

export type CreatedKey = z.infer<typeof CreatedKeySchema>;

// Create-form input schema. Rate limit is optional; backend applies a
// sensible default when omitted. Min/max mirror backend constraints
// (BE PR 0 capped rate_limit at 10_000). The preprocess step turns
// an empty input (blank field) into undefined so the optional() path
// applies; any non-empty value is coerced to a Number for validation.
export const CreateKeyFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(80, 'Name must be 80 characters or fewer'),
  rate_limit: z.preprocess(
    (value) => {
      if (value === '' || value === undefined || value === null) return undefined;
      const n = Number(value);
      return Number.isNaN(n) ? value : n;
    },
    z
      .number()
      .int('Rate limit must be an integer')
      .min(1, 'Rate limit must be at least 1')
      .max(10_000, 'Rate limit cannot exceed 10,000')
      .optional(),
  ),
});

// Input = what the form holds (strings for number inputs).
// Output = what the resolver produces on submit (parsed numbers).
export type CreateKeyFormInput = z.input<typeof CreateKeyFormSchema>;
export type CreateKeyFormValues = z.output<typeof CreateKeyFormSchema>;
