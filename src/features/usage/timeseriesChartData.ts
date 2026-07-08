import type { TimeseriesBucket, TimeseriesInterval } from './schemas';

/**
 * Pure transforms between the backend's timeseries wire shape and what the
 * chart renders. Two invariants live here:
 *
 * 1. The chart's join key is the raw ISO `bucket` string — always unique —
 *    never a formatted label. A gap-filled 24h window contains 25 hourly
 *    buckets whose first and last share the same wall-clock label (same for
 *    DST repeats); joining on labels makes those points ambiguous.
 * 2. Bucket keys are UTC (backend truncates with `date_trunc AT TIME ZONE
 *    'UTC'`). DAY buckets aggregate a UTC calendar day, so their labels must
 *    be formatted in UTC: local-time formatting renders the PREVIOUS day for
 *    every viewer west of Greenwich (the classic off-by-one). HOUR buckets
 *    are points in time and are correctly shown in the viewer's timezone.
 */

export interface BucketFormatOptions {
  /** BCP-47 locale override; defaults to the viewer's locale. Tests pin it. */
  locale?: string;
  /**
   * Display timezone for HOUR buckets; defaults to the viewer's timezone.
   * DAY buckets always format in UTC regardless of this option (see above).
   */
  timeZone?: string;
}

/** Short axis tick label for a bucket. */
export function formatBucketTick(
  iso: string,
  interval: TimeseriesInterval,
  options: BucketFormatOptions = {},
): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  const d = new Date(ms);
  if (interval === 'day') {
    return d.toLocaleDateString(options.locale, {
      month: 'short',
      day: '2-digit',
      timeZone: 'UTC',
    });
  }
  return d.toLocaleTimeString(options.locale, {
    hour: '2-digit',
    minute: '2-digit',
    ...(options.timeZone !== undefined ? { timeZone: options.timeZone } : {}),
  });
}

/**
 * Full-context tooltip label. Hour buckets carry the date as well as the
 * time so the duplicate wall-clock hours of a >24h window stay unambiguous.
 */
export function formatBucketTooltipLabel(
  iso: string,
  interval: TimeseriesInterval,
  options: BucketFormatOptions = {},
): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  const d = new Date(ms);
  if (interval === 'day') {
    return d.toLocaleDateString(options.locale, {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  return d.toLocaleString(options.locale, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...(options.timeZone !== undefined ? { timeZone: options.timeZone } : {}),
  });
}

/**
 * Chart-ready copy of the buckets: fresh array + fresh objects (recharts
 * mutates its `data` internally, and the input belongs to react-query's
 * cache), sorted ascending by bucket timestamp so an out-of-order response
 * can never draw a line that doubles back. Unparseable timestamps sort last
 * instead of being dropped — losing data silently is worse than an odd tail.
 */
export function buildTimeseriesChartData(
  buckets: readonly TimeseriesBucket[],
): TimeseriesBucket[] {
  const orderKey = (b: TimeseriesBucket): number => {
    const ms = Date.parse(b.bucket);
    return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
  };
  return buckets.map((b) => ({ ...b })).sort((a, b) => orderKey(a) - orderKey(b));
}
