import { describe, expect, it } from 'vitest';

import { parseEnvelope } from '@/lib/api/envelope';
import { pricing } from '@/test/msw/fixtures';

import {
  OUTLIER_ABSOLUTE_THRESHOLD_PER_MTOK,
  PricingFormSchema,
  PricingSchema,
  isPricingRateOutlier,
} from '../schemas';

describe('PricingSchema — per-MTok wire shape (backend PR #54)', () => {
  it('parses the list envelope with prompt_rate_per_mtok / completion_rate_per_mtok', () => {
    const parsed = parseEnvelope(
      {
        data: pricing,
        pagination: { limit: 10, offset: 0, total: pricing.length },
      },
      PricingSchema,
    );
    const first = parsed.data[0];
    expect(first?.model_id).toBe('llama3.1:8b');
    expect(first?.prompt_rate_per_mtok).toBeCloseTo(50);
    expect(first?.completion_rate_per_mtok).toBeCloseTo(150);
  });

  it('rejects rows still using the pre-rename per-token field names', () => {
    const legacyRow = {
      id: 201,
      model_id: 'llama3.1:8b',
      prompt_rate: 0.00005,
      completion_rate: 0.00015,
      typical_completion: 500,
      effective_from: '2025-10-01T00:00:00Z',
      active: true,
    };
    expect(PricingSchema.safeParse(legacyRow).success).toBe(false);
  });
});

describe('PricingFormSchema — per-MTok validation', () => {
  const valid = {
    model_id: 'llama3.1:8b',
    prompt_rate_per_mtok: '50',
    completion_rate_per_mtok: '150',
    typical_completion: '500',
  };

  it('coerces human-scale string input to numbers', () => {
    const parsed = PricingFormSchema.parse(valid);
    expect(parsed.prompt_rate_per_mtok).toBe(50);
    expect(parsed.completion_rate_per_mtok).toBe(150);
    expect(parsed.typical_completion).toBe(500);
  });

  it('accepts fractional rates down to 6 decimal places', () => {
    const parsed = PricingFormSchema.parse({
      ...valid,
      prompt_rate_per_mtok: '0.000001',
      completion_rate_per_mtok: '0.123456',
    });
    expect(parsed.prompt_rate_per_mtok).toBe(0.000001);
    expect(parsed.completion_rate_per_mtok).toBe(0.123456);
  });

  it('rejects rates with more than 6 decimal places', () => {
    for (const value of ['0.1234567', '0.0000001', '1e-7']) {
      const result = PricingFormSchema.safeParse({
        ...valid,
        prompt_rate_per_mtok: value,
      });
      expect(result.success).toBe(false);
    }
  });

  it('rejects zero and negative rates', () => {
    for (const value of ['0', '-1']) {
      const result = PricingFormSchema.safeParse({
        ...valid,
        completion_rate_per_mtok: value,
      });
      expect(result.success).toBe(false);
    }
  });

  it('rejects rates above the practical 1e9 maximum', () => {
    const result = PricingFormSchema.safeParse({
      ...valid,
      prompt_rate_per_mtok: '1000000001',
    });
    expect(result.success).toBe(false);
  });

  it('accepts the boundary maximum of exactly 1e9', () => {
    const parsed = PricingFormSchema.parse({
      ...valid,
      prompt_rate_per_mtok: '1000000000',
    });
    expect(parsed.prompt_rate_per_mtok).toBe(1_000_000_000);
  });

  it('leaves typical_completion optional (empty string → undefined)', () => {
    const parsed = PricingFormSchema.parse({
      ...valid,
      typical_completion: '',
    });
    expect(parsed.typical_completion).toBeUndefined();
  });
});

describe('isPricingRateOutlier — order-of-magnitude guard', () => {
  const existing = [50, 150, 500, 1500]; // matches the fixture catalog

  it('flags a rate more than 10x the largest existing rate', () => {
    expect(
      isPricingRateOutlier(
        { prompt_rate_per_mtok: 20_000, completion_rate_per_mtok: 20_000 },
        existing,
      ),
    ).toBe(true);
  });

  it('flags when only one of the two rates is an outlier', () => {
    expect(
      isPricingRateOutlier(
        { prompt_rate_per_mtok: 40, completion_rate_per_mtok: 90_000 },
        existing,
      ),
    ).toBe(true);
  });

  it('does not flag a rate within an order of magnitude of the max', () => {
    expect(
      isPricingRateOutlier(
        { prompt_rate_per_mtok: 4_000, completion_rate_per_mtok: 4_000 },
        existing,
      ),
    ).toBe(false);
  });

  it('uses the absolute ceiling when there are no existing rows', () => {
    expect(
      isPricingRateOutlier(
        {
          prompt_rate_per_mtok: OUTLIER_ABSOLUTE_THRESHOLD_PER_MTOK + 1,
          completion_rate_per_mtok: 1,
        },
        [],
      ),
    ).toBe(true);
    expect(
      isPricingRateOutlier(
        {
          prompt_rate_per_mtok: OUTLIER_ABSOLUTE_THRESHOLD_PER_MTOK,
          completion_rate_per_mtok: 1,
        },
        [],
      ),
    ).toBe(false);
  });

  it('ignores non-positive existing rates when computing the baseline', () => {
    // A catalog of only zero-rate rows behaves like an empty baseline.
    expect(
      isPricingRateOutlier(
        { prompt_rate_per_mtok: 500, completion_rate_per_mtok: 500 },
        [0, 0],
      ),
    ).toBe(false);
    expect(
      isPricingRateOutlier(
        { prompt_rate_per_mtok: 2_000, completion_rate_per_mtok: 500 },
        [0, 0],
      ),
    ).toBe(true);
  });
});
