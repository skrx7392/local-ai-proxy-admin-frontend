import { z } from 'zod';

// Matches internal/store/store.go::CreditPricing after BE Follow-up 1
// added json:"..." tags (skrx7392/local-ai-proxy#31). Prior to that PR,
// the endpoint emitted PascalCase and this schema ran a z.transform() to
// normalize — now gone.
export const PricingSchema = z.object({
  id: z.number().int(),
  model_id: z.string(),
  prompt_rate: z.number(),
  completion_rate: z.number(),
  typical_completion: z.number().int(),
  effective_from: z.string(),
  active: z.boolean(),
});

export type Pricing = z.infer<typeof PricingSchema>;

// Upsert form. Backend requires model_id, prompt_rate>0, completion_rate>0;
// typical_completion defaults to 500 if omitted or <=0.
export const PricingFormSchema = z.object({
  model_id: z.string().trim().min(1, 'Model id is required').max(200),
  prompt_rate: z.preprocess(
    (value) => {
      if (value === '' || value === undefined || value === null) return undefined;
      const n = Number(value);
      return Number.isNaN(n) ? value : n;
    },
    z.number().positive('Must be greater than 0'),
  ),
  completion_rate: z.preprocess(
    (value) => {
      if (value === '' || value === undefined || value === null) return undefined;
      const n = Number(value);
      return Number.isNaN(n) ? value : n;
    },
    z.number().positive('Must be greater than 0'),
  ),
  typical_completion: z.preprocess(
    (value) => {
      if (value === '' || value === undefined || value === null) return undefined;
      const n = Number(value);
      return Number.isNaN(n) ? value : n;
    },
    z.number().int('Must be a whole number').positive('Must be greater than 0').optional(),
  ),
});

export type PricingFormInput = z.input<typeof PricingFormSchema>;
export type PricingFormValues = z.output<typeof PricingFormSchema>;
