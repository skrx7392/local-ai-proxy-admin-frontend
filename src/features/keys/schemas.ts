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

// Detail response from GET /keys/:id and PUT /keys/:id/rate-limit. Adds
// `user_id`, `account_id`, and `session_token_limit` on top of the list
// shape. All three are nullable (unbound keys, limit not set).
export const KeyDetailSchema = KeySchema.extend({
  user_id: z.number().int().nullable(),
  account_id: z.number().int().nullable(),
  session_token_limit: z.number().int().positive().nullable(),
});

export type KeyDetail = z.infer<typeof KeyDetailSchema>;

// Form schema for PUT /keys/:id/rate-limit. Backend requires a positive int
// and caps at 10,000 (same constraints as createKey).
export const UpdateRateLimitFormSchema = z.object({
  rate_limit: z.preprocess(
    (value) => {
      if (value === '' || value === undefined || value === null) return value;
      const n = Number(value);
      return Number.isNaN(n) ? value : n;
    },
    z
      .number()
      .int('Rate limit must be an integer')
      .min(1, 'Rate limit must be at least 1')
      .max(10_000, 'Rate limit cannot exceed 10,000'),
  ),
});

export type UpdateRateLimitFormInput = z.input<typeof UpdateRateLimitFormSchema>;
export type UpdateRateLimitFormValues = z.output<typeof UpdateRateLimitFormSchema>;

// Form schema for PUT /keys/:id/session-limit. `null` removes the limit;
// a positive int sets a new one. Empty string on the form is interpreted
// as "remove the limit" so the form supports both "set" and "clear".
export const UpdateSessionLimitFormSchema = z.object({
  limit: z.preprocess(
    (value) => {
      if (value === '' || value === undefined || value === null) return null;
      const n = Number(value);
      return Number.isNaN(n) ? value : n;
    },
    z
      .number()
      .int('Session limit must be an integer')
      .positive('Session limit must be positive')
      .nullable(),
  ),
});

export type UpdateSessionLimitFormInput = z.input<typeof UpdateSessionLimitFormSchema>;
export type UpdateSessionLimitFormValues = z.output<typeof UpdateSessionLimitFormSchema>;

// Raw response from PUT /keys/:id/session-limit. Not enveloped (backend
// handler returns `{status, limit}` directly — see admin.go::setSessionLimit).
export const UpdateSessionLimitResponseSchema = z.object({
  status: z.literal('updated'),
  limit: z.number().int().positive().nullable(),
});
