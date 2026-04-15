import { describe, expect, it } from 'vitest';

import { qk } from '@/lib/query/keys';

import {
  canonicalizeTimeseriesFilters,
  canonicalizeUsageFilters,
  isIso,
  isRangeValid,
  parseId,
  quickPickRange,
} from '../filters';

const ISO_A = '2026-04-14T00:00:00.000Z';
const ISO_B = '2026-04-15T00:00:00.000Z';

describe('isIso', () => {
  it('accepts Z and ±HH:MM offsets', () => {
    expect(isIso('2026-04-14T10:00:00Z')).toBe(true);
    expect(isIso('2026-04-14T10:00:00.123Z')).toBe(true);
    expect(isIso('2026-04-14T10:00:00+02:00')).toBe(true);
  });

  it('rejects loose / non-RFC3339 strings', () => {
    expect(isIso('2026-04-14')).toBe(false);
    expect(isIso('April 14')).toBe(false);
    expect(isIso('')).toBe(false);
    expect(isIso(null as unknown)).toBe(false);
  });
});

describe('parseId', () => {
  it('returns undefined for empty / invalid inputs', () => {
    expect(parseId('')).toBeUndefined();
    expect(parseId(null)).toBeUndefined();
    expect(parseId(undefined)).toBeUndefined();
    expect(parseId('abc')).toBeUndefined();
    expect(parseId('0')).toBeUndefined();
    expect(parseId('-7')).toBeUndefined();
    expect(parseId('7.5')).toBeUndefined();
  });

  it('parses positive integer ids from numbers or strings', () => {
    expect(parseId(42)).toBe(42);
    expect(parseId('42')).toBe(42);
  });
});

describe('isRangeValid', () => {
  it('rejects reversed or equal ranges', () => {
    expect(isRangeValid(ISO_B, ISO_A)).toBe(false);
    expect(isRangeValid(ISO_A, ISO_A)).toBe(false);
  });
  it('accepts a valid forward range', () => {
    expect(isRangeValid(ISO_A, ISO_B)).toBe(true);
  });
});

describe('quickPickRange', () => {
  it('produces absolute ISO strings anchored at `now`', () => {
    const now = new Date('2026-04-14T12:00:00Z');
    const r = quickPickRange('24h', now);
    expect(r.until).toBe(now.toISOString());
    expect(r.since).toBe(new Date('2026-04-13T12:00:00Z').toISOString());
  });
});

describe('canonicalizeUsageFilters', () => {
  it('drops empties, coerces string IDs, enforces key order', () => {
    // Cast through `unknown` — the public type rejects string IDs, but the
    // canonicalizer is the exact boundary where user input (URL / form) is
    // coerced to numbers, so the test feeds it realistic raw strings.
    const a = canonicalizeUsageFilters({
      since: ISO_A,
      until: ISO_B,
      model: '  llama3  ',
      account_id: '502',
      api_key_id: '',
      user_id: undefined,
    } as unknown as Parameters<typeof canonicalizeUsageFilters>[0]);
    expect(a).not.toBeNull();
    // Key order matters for react-query key equality via JSON comparison.
    expect(Object.keys(a!)).toEqual(['since', 'until', 'model', 'account_id']);
    expect(a!.model).toBe('llama3');
    expect(a!.account_id).toBe(502);
  });

  it('returns null on invalid date range so the hook stays disabled', () => {
    expect(canonicalizeUsageFilters({ since: ISO_B, until: ISO_A })).toBeNull();
    expect(
      canonicalizeUsageFilters({ since: 'not-iso', until: ISO_B }),
    ).toBeNull();
  });

  it('silently omits malformed IDs rather than sending bad requests', () => {
    const a = canonicalizeUsageFilters({
      since: ISO_A,
      until: ISO_B,
      account_id: 'abc' as unknown as number,
    });
    expect(a).not.toBeNull();
    expect(a!.account_id).toBeUndefined();
  });
});

describe('canonicalizeTimeseriesFilters', () => {
  it('keeps interval when valid', () => {
    const a = canonicalizeTimeseriesFilters({
      since: ISO_A,
      until: ISO_B,
      interval: 'day',
    });
    expect(a?.interval).toBe('day');
  });
  it('drops invalid interval', () => {
    const a = canonicalizeTimeseriesFilters({
      since: ISO_A,
      until: ISO_B,
      interval: 'minute' as unknown as 'hour',
    });
    expect(a?.interval).toBeUndefined();
  });
});

describe('canonical filters → query key equality', () => {
  // The whole point of canonicalizing is that two URL shapes that mean the
  // same thing share a react-query cache entry. Two filter objects built
  // in different key orders with the same data must produce the same key.
  it('produces identical keys from differently-ordered inputs', () => {
    const a = canonicalizeUsageFilters({
      since: ISO_A,
      until: ISO_B,
      model: 'm',
      account_id: 5,
    });
    const b = canonicalizeUsageFilters({
      model: 'm',
      account_id: 5,
      until: ISO_B,
      since: ISO_A,
    });
    expect(JSON.stringify(qk.usage.summary(a!))).toBe(
      JSON.stringify(qk.usage.summary(b!)),
    );
  });

  it('summary / byModel / byUser keys do not include interval', () => {
    const withInterval = canonicalizeTimeseriesFilters({
      since: ISO_A,
      until: ISO_B,
      interval: 'day',
    });
    const withoutInterval = canonicalizeUsageFilters({
      since: ISO_A,
      until: ISO_B,
    });
    expect(JSON.stringify(qk.usage.summary(withoutInterval!))).toBe(
      JSON.stringify(qk.usage.summary(withInterval!)),
    );
    // But the timeseries key must partition by interval.
    const dayKey = qk.usage.timeseries(withInterval!);
    const hourKey = qk.usage.timeseries({
      ...withInterval!,
      interval: 'hour',
    });
    expect(JSON.stringify(dayKey)).not.toBe(JSON.stringify(hourKey));
  });
});
