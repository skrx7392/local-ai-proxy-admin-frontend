import type { ModelUsage } from '@/features/usage/schemas';

// A model that has served traffic (appears in usage/by-model) but has no active
// pricing row. Surfaced on the Pricing page so operators can spot models that
// billed — or, worse, served for free — without an explicit rate.
export type UnpricedServingModel = {
  model: string;
  requests: number;
  total_tokens: number;
  credits: number;
  // Observed blended rate = credits actually charged ÷ tokens served, expressed
  // per 1M tokens so it's directly comparable to the priced rows. There is NO
  // backend default/fallback rate: unpriced models are hard-rejected for
  // credit-metered keys, and served at zero cost for legacy keys with no
  // account — so a non-zero value here is historical (charged while a since-
  // archived pricing row was active), and zero means it served for free.
  effective_rate_per_mtok: number;
};

/**
 * Cross-reference usage-by-model against the set of model ids that currently
 * have an active pricing row. Returns the models serving traffic with no such
 * row, each annotated with its observed effective (blended) rate.
 */
export function findUnpricedServingModels(
  usage: readonly ModelUsage[],
  pricedModelIds: Iterable<string>,
): UnpricedServingModel[] {
  const priced = new Set(pricedModelIds);
  return usage
    .filter((u) => !priced.has(u.model))
    .map((u) => ({
      model: u.model,
      requests: u.requests,
      total_tokens: u.total_tokens,
      credits: u.credits,
      effective_rate_per_mtok:
        u.total_tokens > 0 ? (u.credits / u.total_tokens) * 1_000_000 : 0,
    }));
}
