import { describe, expect, it } from 'vitest';

import {
  canonicalFromUrl,
  canonicalTimeseriesFromUrl,
  readUsageFiltersFromUrl,
} from '../url';

const FIXED_NOW = new Date('2026-04-14T12:00:00Z');

describe('readUsageFiltersFromUrl', () => {
  it('falls back to a 24h quick pick when the URL is empty', () => {
    const f = readUsageFiltersFromUrl(null, { now: FIXED_NOW });
    expect(f.until).toBe('2026-04-14T12:00:00.000Z');
    expect(f.since).toBe('2026-04-13T12:00:00.000Z');
  });

  it('reloads identical filters from a URL that was written by the controls', () => {
    const sp = new URLSearchParams(
      'since=2026-04-01T00%3A00%3A00.000Z&until=2026-04-02T00%3A00%3A00.000Z&model=llama3.1%3A8b&account_id=502',
    );
    const f = readUsageFiltersFromUrl(sp, { now: FIXED_NOW });
    expect(f.since).toBe('2026-04-01T00:00:00.000Z');
    expect(f.until).toBe('2026-04-02T00:00:00.000Z');
    expect(f.model).toBe('llama3.1:8b');
    expect(f.account_id).toBe(502);
  });

  it('ignores malformed ids + non-ISO dates rather than sending bad requests', () => {
    const sp = new URLSearchParams(
      'since=yesterday&until=today&account_id=abc&model=',
    );
    const f = readUsageFiltersFromUrl(sp, { now: FIXED_NOW });
    expect(f.account_id).toBeUndefined();
    expect(f.model).toBeUndefined();
    // Falls back to the default 24h range instead of leaving invalid ISO.
    expect(f.since).toBe('2026-04-13T12:00:00.000Z');
    expect(f.until).toBe('2026-04-14T12:00:00.000Z');
  });
});

describe('canonicalFromUrl / canonicalTimeseriesFromUrl', () => {
  it('produces a valid canonical shape for a well-formed URL', () => {
    const sp = new URLSearchParams('interval=day');
    const c = canonicalFromUrl(sp, { now: FIXED_NOW });
    const t = canonicalTimeseriesFromUrl(sp, { now: FIXED_NOW });
    expect(c).not.toBeNull();
    expect(t?.interval).toBe('day');
  });
});
