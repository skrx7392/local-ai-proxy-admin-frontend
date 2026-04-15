import { z } from 'zod';

// Backend quirk: store.CreditPricing has no `json:"..."` tags, so the
// list endpoint emits PascalCase field names straight from the Go
// struct. Meanwhile the upsert endpoint accepts and documents snake_case.
// This schema reads the wire shape and normalizes to snake_case for all
// internal consumers so the rest of the frontend doesn't need to know.
// Backend follow-up: add JSON tags to CreditPricing for consistency.
export const PricingWireSchema = z.object({
  ID: z.number().int(),
  ModelID: z.string(),
  PromptRate: z.number(),
  CompletionRate: z.number(),
  TypicalCompletion: z.number().int(),
  EffectiveFrom: z.string(),
  Active: z.boolean(),
});

export const PricingSchema = PricingWireSchema.transform((raw) => ({
  id: raw.ID,
  model_id: raw.ModelID,
  prompt_rate: raw.PromptRate,
  completion_rate: raw.CompletionRate,
  typical_completion: raw.TypicalCompletion,
  effective_from: raw.EffectiveFrom,
  active: raw.Active,
}));

export type Pricing = z.output<typeof PricingSchema>;

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
