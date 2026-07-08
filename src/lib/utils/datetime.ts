// Shared date/time formatting. Two views of the same instant:
//   - formatRelativeTime  → "5 minutes ago" (the default, compact, table-friendly)
//   - formatAbsoluteTime  → "Jan 12, 2026, 10:00:00 UTC" (revealed on hover)
//
// Both accept an ISO-8601 string and return the input verbatim when it can't be
// parsed, so a malformed value degrades to something visible rather than "Invalid
// Date". `now` is injectable on the relative formatter so tests stay deterministic.

const RELATIVE_DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] =
  [
    { amount: 60, unit: 'second' },
    { amount: 60, unit: 'minute' },
    { amount: 24, unit: 'hour' },
    { amount: 7, unit: 'day' },
    { amount: 4.34524, unit: 'week' },
    { amount: 12, unit: 'month' },
    { amount: Number.POSITIVE_INFINITY, unit: 'year' },
  ];

const relativeFmt = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

// Fixed UTC absolute format so the hover tooltip is identical regardless of the
// viewer's (or CI runner's) timezone — matches the styleguide's "· UTC" pattern.
const absoluteFmt = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'UTC',
  timeZoneName: 'short',
});

/**
 * Relative time such as "5 minutes ago" or "in 3 days". Returns the raw input
 * if it isn't a parseable date.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;

  let duration = (then - now.getTime()) / 1000; // seconds; negative = in the past
  for (const division of RELATIVE_DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return relativeFmt.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  // Unreachable (last division is Infinity) but keeps the type checker happy.
  return relativeFmt.format(Math.round(duration), 'year');
}

/**
 * Absolute UTC time such as "Jan 12, 2026, 10:00:00 UTC". Returns the raw input
 * if it isn't a parseable date.
 */
export function formatAbsoluteTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return absoluteFmt.format(date);
}
