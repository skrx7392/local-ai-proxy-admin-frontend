import { describe, expect, it } from 'vitest';

import { parseDataEnvelope, parseEnvelope } from '@/lib/api/envelope';
import {
  usageByModel,
  usageByUser,
  usageSummary,
  usageTimeseries,
} from '@/test/msw/fixtures';

import {
  ModelUsageSchema,
  OwnerUsageRowSchema,
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

  it('parses the by-model list envelope', () => {
    const parsed = parseEnvelope(
      {
        data: usageByModel,
        pagination: { limit: 10, offset: 0, total: usageByModel.length },
      },
      ModelUsageSchema,
    );
    expect(parsed.data[0]?.model).toBe('llama3.1:8b');
    expect(parsed.pagination.total).toBe(usageByModel.length);
  });

  it('parses the by-user list envelope with all three owner_type variants', () => {
    const parsed = parseEnvelope(
      {
        data: usageByUser,
        pagination: { limit: 10, offset: 0, total: usageByUser.length },
      },
      OwnerUsageRowSchema,
    );
    const kinds = parsed.data.map((r) => r.owner_type);
    expect(kinds).toContain('user');
    expect(kinds).toContain('service');
    expect(kinds).toContain('unattributed');
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
