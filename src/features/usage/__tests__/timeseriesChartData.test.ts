import { describe, expect, it } from 'vitest';

import {
  buildTimeseriesChartData,
  formatBucketTick,
  formatBucketTooltipLabel,
} from '../timeseriesChartData';

import type { TimeseriesBucket } from '../schemas';

// Fixed locale in every assertion so tests don't depend on the runner's
// environment. Timezone is passed explicitly for the same reason — that is
// also the production-relevant axis: bucket keys are UTC, viewers are not.
const LOCALE = 'en-US';

function bucket(iso: string, overrides: Partial<TimeseriesBucket> = {}): TimeseriesBucket {
  return {
    bucket: iso,
    requests: 0,
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    credits: 0,
    errors: 0,
    ...overrides,
  };
}

/** Gap-filled hourly window fixture: `count` buckets starting at startIso. */
function hourly(startIso: string, count: number): TimeseriesBucket[] {
  const start = Date.parse(startIso);
  return Array.from({ length: count }, (_, i) =>
    bucket(new Date(start + i * 3_600_000).toISOString(), { requests: 100 + i }),
  );
}

/** Gap-filled daily window fixture: `count` UTC-midnight buckets. */
function daily(startIso: string, count: number): TimeseriesBucket[] {
  const start = Date.parse(startIso);
  return Array.from({ length: count }, (_, i) =>
    bucket(new Date(start + i * 86_400_000).toISOString(), { requests: 10 + i }),
  );
}

describe('formatBucketTick', () => {
  it('labels DAY buckets with their UTC date — never shifted into the viewer timezone', () => {
    // The backend aggregates calendar days in UTC and keys the bucket at UTC
    // midnight. In any negative-offset timezone a local-time format renders
    // the PREVIOUS day (classic off-by-one): 2026-07-08T00:00Z is Jul 7,
    // 8:00 PM in New York.
    const iso = '2026-07-08T00:00:00Z';
    expect(
      formatBucketTick(iso, 'day', { locale: LOCALE, timeZone: 'America/New_York' }),
    ).toBe('Jul 08');
    expect(
      formatBucketTick(iso, 'day', { locale: LOCALE, timeZone: 'Asia/Kolkata' }),
    ).toBe('Jul 08');
    expect(
      formatBucketTick(iso, 'day', { locale: LOCALE, timeZone: 'Pacific/Kiritimati' }),
    ).toBe('Jul 08');
  });

  it('labels HOUR buckets in the viewer timezone (offset case)', () => {
    // Hour buckets ARE meaningfully local: 18:00Z is 2:00 PM in New York
    // (EDT, -4) and 11:30 PM in Kolkata (+5:30).
    const iso = '2026-07-08T18:00:00Z';
    expect(
      formatBucketTick(iso, 'hour', { locale: LOCALE, timeZone: 'America/New_York' }),
    ).toBe('02:00 PM');
    expect(
      formatBucketTick(iso, 'hour', { locale: LOCALE, timeZone: 'Asia/Kolkata' }),
    ).toBe('11:30 PM');
    expect(
      formatBucketTick(iso, 'hour', { locale: LOCALE, timeZone: 'UTC' }),
    ).toBe('06:00 PM');
  });

  it('returns the raw value for unparseable timestamps', () => {
    expect(formatBucketTick('not-a-date', 'hour', { locale: LOCALE })).toBe(
      'not-a-date',
    );
  });
});

describe('formatBucketTooltipLabel', () => {
  it('gives HOUR buckets full date + time context so duplicate wall-clock hours are unambiguous', () => {
    // A gap-filled 24h window spans 25 hourly buckets: the first and last
    // share the same wall-clock label. The tooltip must disambiguate.
    const first = '2026-07-07T18:00:00Z';
    const last = '2026-07-08T18:00:00Z';
    const opts = { locale: LOCALE, timeZone: 'America/New_York' };
    const a = formatBucketTooltipLabel(first, 'hour', opts);
    const b = formatBucketTooltipLabel(last, 'hour', opts);
    expect(a).not.toBe(b);
    expect(a).toContain('Jul 07');
    expect(b).toContain('Jul 08');
  });

  it('gives DAY buckets a UTC date with year', () => {
    expect(
      formatBucketTooltipLabel('2026-07-08T00:00:00Z', 'day', {
        locale: LOCALE,
        timeZone: 'America/New_York',
      }),
    ).toBe('Jul 08, 2026');
  });

  it('returns the raw value for unparseable timestamps', () => {
    expect(formatBucketTooltipLabel('junk', 'day', { locale: LOCALE })).toBe('junk');
  });
});

describe('buildTimeseriesChartData', () => {
  it('1h range: preserves both buckets of a gap-filled hourly window with unique keys', () => {
    // A 1h quick pick truncates to the hour → 2 hourly buckets.
    const input = hourly('2026-07-08T09:00:00Z', 2);
    const data = buildTimeseriesChartData(input);
    expect(data).toHaveLength(2);
    expect(new Set(data.map((d) => d.bucket)).size).toBe(2);
    expect(data.map((d) => d.requests)).toEqual([100, 101]);
  });

  it('24h range: keeps all 25 gap-filled hourly buckets even when first/last share a wall-clock label', () => {
    const input = hourly('2026-07-07T18:00:00Z', 25);
    const data = buildTimeseriesChartData(input);
    expect(data).toHaveLength(25);
    // The unique join key is the ISO bucket, not the display label.
    expect(new Set(data.map((d) => d.bucket)).size).toBe(25);
    const first = data[0]!;
    const last = data[24]!;
    expect(
      formatBucketTick(first.bucket, 'hour', { locale: LOCALE, timeZone: 'UTC' }),
    ).toBe(
      formatBucketTick(last.bucket, 'hour', { locale: LOCALE, timeZone: 'UTC' }),
    );
    expect(first.bucket).not.toBe(last.bucket);
  });

  it('7d range: 7 daily buckets survive the transform in order', () => {
    const input = daily('2026-07-01T00:00:00Z', 7);
    const data = buildTimeseriesChartData(input);
    expect(data).toHaveLength(7);
    expect(data.map((d) => d.requests)).toEqual([10, 11, 12, 13, 14, 15, 16]);
  });

  it('30d range: 30 daily buckets, sorted ascending', () => {
    const input = daily('2026-06-08T00:00:00Z', 30);
    const data = buildTimeseriesChartData(input);
    expect(data).toHaveLength(30);
    for (let i = 1; i < data.length; i += 1) {
      expect(Date.parse(data[i]!.bucket)).toBeGreaterThan(
        Date.parse(data[i - 1]!.bucket),
      );
    }
  });

  it('sorts out-of-order buckets by timestamp so the line cannot zigzag backwards', () => {
    const ordered = hourly('2026-07-08T00:00:00Z', 4);
    const shuffled = [ordered[2]!, ordered[0]!, ordered[3]!, ordered[1]!];
    const data = buildTimeseriesChartData(shuffled);
    expect(data.map((d) => d.requests)).toEqual([100, 101, 102, 103]);
  });

  it('returns a fresh array and fresh objects — never mutates the react-query cache', () => {
    const input = hourly('2026-07-08T00:00:00Z', 3);
    const snapshot = input.map((b) => ({ ...b }));
    const data = buildTimeseriesChartData(input);
    expect(data).not.toBe(input);
    expect(data[0]).not.toBe(input[0]);
    expect(input).toEqual(snapshot);
  });

  it('keeps buckets with unparseable timestamps (at the end) rather than dropping data', () => {
    const input = [bucket('garbage', { requests: 7 }), ...hourly('2026-07-08T00:00:00Z', 2)];
    const data = buildTimeseriesChartData(input);
    expect(data).toHaveLength(3);
    expect(data[2]!.bucket).toBe('garbage');
  });
});
