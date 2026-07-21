import { describe, expect, it } from 'vitest';

import { parseDataEnvelope, parseEnvelope } from '@/lib/api/envelope';
import {
  usageByAccount,
  usageByModel,
  usageSummary,
  usageTimeseries,
} from '@/test/msw/fixtures';

import {
  AccountUsageRowSchema,
  ModelUsageSchema,
  TimeseriesResponseSchema,
  UsageSummarySchema,
} from '../schemas';

describe('usage schemas — exact BE 2 envelope shapes', () => {
  it('parses the summary detail envelope', () => {
    const parsed = parseDataEnvelope(
      { data: usageSummary },
      UsageSummarySchema,
    );
    expect(parsed.requests).toBe(usageSummary.requests);
    expect(parsed.credits).toBe(usageSummary.credits);
  });

  it('parses the by-model list envelope with performance metrics', () => {
    const parsed = parseEnvelope(
      {
        data: usageByModel,
        pagination: { limit: 10, offset: 0, total: usageByModel.length },
      },
      ModelUsageSchema,
    );
    expect(parsed.data[0]?.model).toBe('llama3.1:8b');
    expect(parsed.pagination.total).toBe(usageByModel.length);
    expect(parsed.data[0]?.tok_per_sec).toBeGreaterThan(0);
    expect(parsed.data[0]?.p95_duration_ms).toBeGreaterThan(0);
    expect(parsed.data[0]?.prompt_tokens).toBeGreaterThan(0);
    expect(parsed.data[0]?.completion_tokens).toBeGreaterThan(0);
  });

  it('parses null speed/percentiles (model with no completed requests)', () => {
    const allFailed = {
      model: 'mistral:7b',
      requests: 12,
      total_tokens: 0,
      credits: 0,
      avg_duration_ms: 45.2,
      prompt_tokens: 0,
      completion_tokens: 0,
      tok_per_sec: null,
      p50_duration_ms: null,
      p95_duration_ms: null,
      error_count: 12,
      partial_count: 0,
    };
    const parsed = ModelUsageSchema.parse(allFailed);
    expect(parsed.tok_per_sec).toBeNull();
    expect(parsed.p50_duration_ms).toBeNull();
    expect(parsed.p95_duration_ms).toBeNull();
    expect(parsed.error_count).toBe(12);
  });

  it('rejects the pre-metrics wire shape (loud, not tolerant)', () => {
    const legacy = {
      model: 'llama3.1:8b',
      requests: 9_120,
      total_tokens: 1_402_044,
      credits: 21.03,
      avg_duration_ms: 311.5,
    };
    expect(() => ModelUsageSchema.parse(legacy)).toThrow();
  });

  it('parses the by-account list envelope with all four account populations', () => {
    const parsed = parseEnvelope(
      {
        data: usageByAccount,
        pagination: { limit: 10, offset: 0, total: usageByAccount.length },
      },
      AccountUsageRowSchema,
    );
    const kinds = parsed.data.map((r) => r.account_type);
    expect(kinds).toContain('personal');
    expect(kinds).toContain('service');
    expect(kinds).toContain('end_user');
    // Legacy admin keys with no account: full-NULL identity, real aggregates.
    const orphan = parsed.data.find((r) => r.account_id === null);
    expect(orphan).toBeDefined();
    expect(orphan?.account_type).toBeNull();
    expect(orphan?.requests).toBeGreaterThan(0);
  });

  it('parses the timeseries detail envelope (not list!)', () => {
    const parsed = parseDataEnvelope(
      { data: usageTimeseries },
      TimeseriesResponseSchema,
    );
    expect(parsed.interval).toBe('hour');
    expect(parsed.buckets).toHaveLength(24);
    expect(parsed.buckets[0]?.bucket).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('rejects a timeseries response in list shape (locked decision #20)', () => {
    expect(() =>
      parseDataEnvelope(
        { data: [usageTimeseries.buckets[0]], pagination: { limit: 24, offset: 0, total: 24 } },
        TimeseriesResponseSchema,
      ),
    ).toThrow();
  });
});
