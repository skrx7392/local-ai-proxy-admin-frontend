import { describe, expect, it } from 'vitest';

import { formatAbsoluteTime, formatRelativeTime } from '../datetime';

describe('formatRelativeTime', () => {
  const now = new Date('2026-07-08T12:00:00Z');

  it('renders "now" for the current instant', () => {
    expect(formatRelativeTime('2026-07-08T12:00:00Z', now)).toBe('now');
  });

  it('renders minutes in the past', () => {
    expect(formatRelativeTime('2026-07-08T11:55:00Z', now)).toBe('5 minutes ago');
  });

  it('renders hours in the past', () => {
    expect(formatRelativeTime('2026-07-08T09:00:00Z', now)).toBe('3 hours ago');
  });

  it('renders days in the past', () => {
    expect(formatRelativeTime('2026-07-06T12:00:00Z', now)).toBe('2 days ago');
  });

  it('renders months in the past', () => {
    expect(formatRelativeTime('2026-05-08T12:00:00Z', now)).toBe('2 months ago');
  });

  it('renders future instants', () => {
    expect(formatRelativeTime('2026-07-08T12:30:00Z', now)).toBe('in 30 minutes');
  });

  it('returns the raw input for an unparseable value', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('not-a-date');
  });
});

describe('formatAbsoluteTime', () => {
  it('formats in UTC regardless of runner timezone', () => {
    const out = formatAbsoluteTime('2026-01-12T10:00:00Z');
    // Deterministic UTC output — assert on the stable, timezone-independent parts.
    expect(out).toContain('Jan 12, 2026');
    expect(out).toContain('10:00:00');
    expect(out).toContain('UTC');
  });

  it('returns the raw input for an unparseable value', () => {
    expect(formatAbsoluteTime('nope')).toBe('nope');
  });
});
