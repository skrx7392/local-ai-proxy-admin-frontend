import { z } from 'zod';

// Matches internal/admin/admin.go::listRegistrationTokens tokenResponse.
// Field names are singular (credit_grant) and the boolean is `revoked`,
// same inverted pattern as keys. Backend still accepts ?is_active=
// filter and maps internally to !revoked.
export const RegistrationTokenSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  credit_grant: z.number(),
  max_uses: z.number().int(),
  uses: z.number().int(),
  created_at: z.string(),
  expires_at: z.string().nullable(),
  revoked: z.boolean(),
});

export type RegistrationToken = z.infer<typeof RegistrationTokenSchema>;

// Create response — the plaintext token lands in `token`, returned once.
// Lean shape mirroring internal/admin/admin.go::createRegistrationToken.
export const CreatedRegistrationTokenSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  token: z.string().min(16),
  credit_grant: z.number(),
  max_uses: z.number().int(),
});

export type CreatedRegistrationToken = z.infer<
  typeof CreatedRegistrationTokenSchema
>;

// Create-form input. expires_at is an optional ISO string (RFC3339);
// the backend validates the format. Empty string → undefined so a
// blank input becomes a "no expiry" token.
export const RegistrationTokenFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  credit_grant: z.preprocess(
    (value) => {
      if (value === '' || value === undefined || value === null) return undefined;
      const n = Number(value);
      return Number.isNaN(n) ? value : n;
    },
    z.number().nonnegative('Must be zero or greater'),
  ),
  max_uses: z.preprocess(
    (value) => {
      if (value === '' || value === undefined || value === null) return undefined;
      const n = Number(value);
      return Number.isNaN(n) ? value : n;
    },
    z
      .number()
      .int('Must be a whole number')
      .positive('Must be greater than 0')
      .optional(),
  ),
  expires_at: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || !Number.isNaN(Date.parse(v)),
      'Must be an ISO date string',
    )
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : v)),
});

export type RegistrationTokenFormInput = z.input<
  typeof RegistrationTokenFormSchema
>;
export type RegistrationTokenFormValues = z.output<
  typeof RegistrationTokenFormSchema
>;
