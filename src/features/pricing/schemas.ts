import { z } from 'zod';

// Matches internal/store/store.go::CreditPricing after backend PR #54
// renamed the rate fields to per-million-token semantics:
// `prompt_rate_per_mtok` / `completion_rate_per_mtok` are credits per
// 1M tokens, stored at 6 decimal places. (The pre-rename per-token
// `prompt_rate` / `completion_rate` names are gone; the endpoint now
// uses strict JSON decoding and 400s on any unknown key.)
export const PricingSchema = z.object({
  id: z.number().int(),
  model_id: z.string(),
  prompt_rate_per_mtok: z.number(),
  completion_rate_per_mtok: z.number(),
  typical_completion: z.number().int(),
  effective_from: z.string(),
  active: z.boolean(),
});

export type Pricing = z.infer<typeof PricingSchema>;

// Practical ceiling on a per-MTok rate (backend guidance: ~1e9).
export const MAX_RATE_PER_MTOK = 1_000_000_000;

// Form inputs arrive as strings; empty means "not provided".
function toNumberOrUndefined(value: unknown): unknown {
  if (value === '' || value === undefined || value === null) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? value : n;
}

// The backend stores rates at 6 decimal places, so reject anything finer
// instead of silently rounding. `String()` renders positive numbers below
// 1e-6 in scientific notation, which correctly fails the check.
function hasAtMostSixDecimals(value: number): boolean {
  const text = String(value);
  if (text.includes('e') || text.includes('E')) return false;
  const fraction = text.split('.')[1] ?? '';
  return fraction.length <= 6;
}

const ratePerMtok = z.preprocess(
  toNumberOrUndefined,
  z
    .number()
    .positive('Must be greater than 0')
    .max(MAX_RATE_PER_MTOK, 'Must be 1,000,000,000 or less')
    .refine(hasAtMostSixDecimals, 'Use at most 6 decimal places'),
);

// Upsert form. Backend requires model_id and both per-MTok rates > 0;
// typical_completion defaults to 500 if omitted or <=0.
export const PricingFormSchema = z.object({
  model_id: z.string().trim().min(1, 'Model id is required').max(200),
  prompt_rate_per_mtok: ratePerMtok,
  completion_rate_per_mtok: ratePerMtok,
  typical_completion: z.preprocess(
    toNumberOrUndefined,
    z.number().int('Must be a whole number').positive('Must be greater than 0').optional(),
  ),
});

export type PricingFormInput = z.input<typeof PricingFormSchema>;
export type PricingFormValues = z.output<typeof PricingFormSchema>;
