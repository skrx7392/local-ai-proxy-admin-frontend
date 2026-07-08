import { z } from 'zod';

import { EXPIRY_PRESETS, localInputToIso, resolveExpiryIso } from './expiry';

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

// Create-form input. Expiry is chosen via duration presets or a custom
// local datetime (see expiry.ts); the schema resolves the choice to an
// ISO 8601 UTC `expires_at` at parse time so the output shape consumed by
// hooks.ts is unchanged. Undefined = "no expiry" (POSTed as null).
export const RegistrationTokenFormSchema = z
  .object({
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
    expiry_preset: z.enum(EXPIRY_PRESETS),
    expiry_custom: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    // Defense in depth — the datetime-local picker already enforces
    // `min = now`, but the schema must reject bad values regardless.
    if (value.expiry_preset !== 'custom') return;
    const iso = localInputToIso(value.expiry_custom ?? '');
    if (iso === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['expiry_custom'],
        message: 'Pick an expiry date and time',
      });
      return;
    }
    if (Date.parse(iso) <= Date.now()) {
      ctx.addIssue({
        code: 'custom',
        path: ['expiry_custom'],
        message: 'Expiry must be in the future',
      });
    }
  })
  .transform(({ expiry_preset, expiry_custom, ...rest }) => ({
    ...rest,
    expires_at: resolveExpiryIso(expiry_preset, expiry_custom ?? ''),
  }));

export type RegistrationTokenFormInput = z.input<
  typeof RegistrationTokenFormSchema
>;
export type RegistrationTokenFormValues = z.output<
  typeof RegistrationTokenFormSchema
>;
