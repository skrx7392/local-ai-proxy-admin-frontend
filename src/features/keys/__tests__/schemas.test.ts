import { describe, expect, it } from 'vitest';

import { KeySchema } from '../schemas';

const base = {
  id: 1,
  name: 'ci-token',
  key_prefix: 'sk-abc',
  rate_limit: 60,
  created_at: '2026-07-01T00:00:00Z',
  revoked: false,
};

describe('KeySchema last_used_at tolerance', () => {
  it('accepts an ISO string when the key has served a request', () => {
    const parsed = KeySchema.parse({ ...base, last_used_at: '2026-07-08T12:00:00Z' });
    expect(parsed.last_used_at).toBe('2026-07-08T12:00:00Z');
  });

  it('accepts null when the key has never served a request', () => {
    const parsed = KeySchema.parse({ ...base, last_used_at: null });
    expect(parsed.last_used_at).toBeNull();
  });

  it('accepts the field being absent (older backend / omitting response)', () => {
    // Regression: a backend that omits last_used_at must not fail the whole
    // keys query. `.nullable()` alone rejects a missing key; `.optional()`
    // lets it degrade to undefined, which the column renders as "Never".
    const parsed = KeySchema.parse(base);
    expect(parsed.last_used_at).toBeUndefined();
  });
});
