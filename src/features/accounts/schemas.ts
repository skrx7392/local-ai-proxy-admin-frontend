import { z } from 'zod';

// Matches internal/admin/admin.go::listAccounts accountResponse.
// Balances are floats (dollars), not integer cents.
export const AccountSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  type: z.string(),
  is_active: z.boolean(),
  balance: z.number(),
  reserved: z.number(),
  available: z.number(),
  created_at: z.string(),
});

export type Account = z.infer<typeof AccountSchema>;

// grantCredits response shape (internal/admin/admin.go).
export const GrantCreditsResponseSchema = z.object({
  status: z.literal('granted'),
  amount: z.number(),
  balance: z.number(),
});

export type GrantCreditsResponse = z.infer<typeof GrantCreditsResponseSchema>;

// Grant form input. Backend accepts any non-zero amount (positive grants
// credits, negative claws back). Description is optional server-side but
// we encourage it in the UI so the ledger stays readable.
export const GrantCreditsFormSchema = z.object({
  amount: z.preprocess(
    (value) => {
      if (value === '' || value === undefined || value === null) return undefined;
      const n = Number(value);
      return Number.isNaN(n) ? value : n;
    },
    z
      .number()
      .refine((n) => n !== 0, 'Amount cannot be zero'),
  ),
  description: z.string().trim().max(500, 'Too long').optional(),
});

export type GrantCreditsFormInput = z.input<typeof GrantCreditsFormSchema>;
export type GrantCreditsFormValues = z.output<typeof GrantCreditsFormSchema>;

// Create-account-scoped-key — same wire shape as plain key create.
export const AccountKeyFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
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

export type AccountKeyFormInput = z.input<typeof AccountKeyFormSchema>;
export type AccountKeyFormValues = z.output<typeof AccountKeyFormSchema>;
