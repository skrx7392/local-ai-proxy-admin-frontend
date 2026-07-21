import { describe, expect, it } from 'vitest';

import type { ModelUsage } from '@/features/usage/schemas';
import { makeModelUsage } from '@/test/factories';

import { findUnpricedServingModels } from '../unpriced';

const usage: ModelUsage[] = [
  makeModelUsage({
    model: 'llama3.1:8b',
    requests: 9_120,
    total_tokens: 1_402_044,
    credits: 21.03,
    avg_duration_ms: 311.5,
  }),
  makeModelUsage({
    // Served traffic, accrued credits, but no active pricing row.
    model: 'gemma4:e2b',
    requests: 640,
    total_tokens: 869_200,
    credits: 21.73,
    avg_duration_ms: 290.4,
  }),
  makeModelUsage({
    // Served for free (legacy no-account key path) — no pricing, zero credits.
    model: 'phi3:mini',
    requests: 12,
    total_tokens: 40_000,
    credits: 0,
    avg_duration_ms: 120,
  }),
];

describe('findUnpricedServingModels', () => {
  it('returns only models with no active pricing row', () => {
    const result = findUnpricedServingModels(usage, ['llama3.1:8b', 'llama3.1:70b']);
    expect(result.map((m) => m.model)).toEqual(['gemma4:e2b', 'phi3:mini']);
  });

  it('computes the observed effective rate as credits/tokens per 1M', () => {
    const result = findUnpricedServingModels(usage, ['llama3.1:8b']);
    const gemma = result.find((m) => m.model === 'gemma4:e2b');
    // 21.73 / 869_200 * 1e6 = 25.0 credits / 1M tokens
    expect(gemma?.effective_rate_per_mtok).toBeCloseTo(25.0, 4);
  });

  it('reports a zero effective rate for models that served without charge', () => {
    const result = findUnpricedServingModels(usage, ['llama3.1:8b']);
    const phi = result.find((m) => m.model === 'phi3:mini');
    expect(phi?.effective_rate_per_mtok).toBe(0);
  });

  it('returns nothing when every serving model is priced', () => {
    const result = findUnpricedServingModels(usage, [
      'llama3.1:8b',
      'gemma4:e2b',
      'phi3:mini',
    ]);
    expect(result).toEqual([]);
  });
});
