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
  // End-user allowance fields (docs/design/credit-requests.md §4/§6).
  // effective_monthly_grant is the override resolved against the env
  // default server-side; null on non-allowance-managed accounts.
  allowance_managed: z.boolean(),
  monthly_grant: z.number().nullable(),
  effective_monthly_grant: z.number().nullable(),
  email: z.string().nullable(),
});

export type Account = z.infer<typeof AccountSchema>;

// One cap-hit credit request row (GET /api/admin/credit-requests).
export const CreditRequestSchema = z.object({
  id: z.number().int(),
  account_id: z.number().int(),
  account_name: z.string(),
  email: z.string().nullable(),
  period: z.string(), // YYYY-MM-DD, first day of the month
  status: z.enum(['pending', 'granted', 'dismissed', 'expired']),
  created_at: z.string(),
  resolved_at: z.string().nullable(),
  resolved_note: z.string().nullable(),
  effective_monthly_grant: z.number(),
  balance: z.number(),
});

export type CreditRequest = z.infer<typeof CreditRequestSchema>;

// PUT /api/admin/credit-requests/{id} → detail envelope {data: {id, status}}.
export const ResolveCreditRequestResponseSchema = z.object({
  id: z.number().int(),
  status: z.enum(['granted', 'dismissed']),
});

// PUT /api/admin/accounts/{id}/allowance response.
export const SetAllowanceResponseSchema = z.object({
  status: z.literal('updated'),
  monthly_grant: z.number().nullable(),
});

// Allowance editor form. The number sets a per-account override; clearing
// back to the env default is a separate explicit action (never an empty
// submit — that's a validation error, mirroring the backend's "null must be
// spelled out" contract).
export const AllowanceFormSchema = z.object({
  monthly_grant: z.preprocess(
    (value) => {
      if (value === '' || value === undefined || value === null) return undefined;
      const n = Number(value);
      return Number.isNaN(n) ? value : n;
    },
    z.number().min(0, 'Allowance cannot be negative'),
  ),
});

export type AllowanceFormInput = z.input<typeof AllowanceFormSchema>;
export type AllowanceFormValues = z.output<typeof AllowanceFormSchema>;

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
