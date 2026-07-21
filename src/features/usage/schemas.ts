import { z } from 'zod';

// Mirrors PLAN.md "Locked Decisions" #20 + "Analytics HTTP wire shapes (PR 2)".
// Two envelope flavors are in use:
//   - summary, timeseries   → detail envelope  `{data: obj}`           → parseDataEnvelope
//   - by-model, by-account  → list envelope    `{data: [...], pagination}` → parseEnvelope
//
// A deviation here versus the backend's JSON output is a merge blocker on either
// side — FE F and BE 2 share this contract and keep the Zod schemas loud on the
// parse boundary rather than tolerant.

export const UsageSummarySchema = z.object({
  requests: z.number().int().nonnegative(),
  prompt_tokens: z.number().int().nonnegative(),
  completion_tokens: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
  credits: z.number().nonnegative(),
  avg_duration_ms: z.number().nonnegative(),
  errors: z.number().int().nonnegative(),
});
export type UsageSummary = z.infer<typeof UsageSummarySchema>;

export const ModelUsageSchema = z.object({
  model: z.string(),
  requests: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
  credits: z.number().nonnegative(),
  avg_duration_ms: z.number().nonnegative(),
});
export type ModelUsage = z.infer<typeof ModelUsageSchema>;

// Billing-account grouping (replaced the by-user owner grouping after EUA):
// account_type null + account_id null = the single unattributed bucket for
// legacy admin keys with no account. email is display metadata — federated
// identity email for end_user accounts, owning user's email for personal.
export const AccountTypeSchema = z.enum(['personal', 'service', 'end_user']);
export type AccountType = z.infer<typeof AccountTypeSchema>;

export const AccountUsageRowSchema = z.object({
  account_id: z.number().int().nullable(),
  account_name: z.string().nullable(),
  account_type: AccountTypeSchema.nullable(),
  email: z.string().nullable(),
  requests: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
  credits: z.number().nonnegative(),
  key_count: z.number().int().nonnegative(),
});
export type AccountUsageRow = z.infer<typeof AccountUsageRowSchema>;

export const TimeseriesBucketSchema = z.object({
  // RFC3339 string; bucket alignment comes from the handler (not SQL).
  bucket: z.string(),
  requests: z.number().int().nonnegative(),
  prompt_tokens: z.number().int().nonnegative(),
  completion_tokens: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
  credits: z.number().nonnegative(),
  errors: z.number().int().nonnegative(),
});
export type TimeseriesBucket = z.infer<typeof TimeseriesBucketSchema>;

export const TimeseriesIntervalSchema = z.enum(['hour', 'day']);
export type TimeseriesInterval = z.infer<typeof TimeseriesIntervalSchema>;

export const TimeseriesResponseSchema = z.object({
  interval: TimeseriesIntervalSchema,
  buckets: z.array(TimeseriesBucketSchema),
});
export type TimeseriesResponse = z.infer<typeof TimeseriesResponseSchema>;
