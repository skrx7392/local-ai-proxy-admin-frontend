import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { createQueryClient } from '../client';

// The retry predicate is a plain function on defaultOptions, so we can
// exercise it directly without spinning up a full QueryClientProvider.
function getQueryRetry(): (count: number, error: unknown) => boolean {
  const client = createQueryClient();
  const retry = client.getDefaultOptions().queries?.retry;
  if (typeof retry !== 'function') {
    throw new Error('expected retry to be a function');
  }
  return retry as (count: number, error: unknown) => boolean;
}

describe('createQueryClient', () => {
  it('does not retry on 4xx ApiError (intent bug, not transient)', () => {
    const retry = getQueryRetry();
    const err404 = new ApiError(404, 'not_found', 'missing');
    const err409 = new ApiError(409, 'conflict', 'stale');
    expect(retry(0, err404)).toBe(false);
    expect(retry(0, err409)).toBe(false);
  });

  it('retries transient network / 5xx errors up to 2 times', () => {
    const retry = getQueryRetry();
    const err500 = new ApiError(500, 'internal', 'boom');
    expect(retry(0, err500)).toBe(true);
    expect(retry(1, err500)).toBe(true);
    expect(retry(2, err500)).toBe(false);
  });

  it('retries non-ApiError network failures (typically TypeError from fetch)', () => {
    const retry = getQueryRetry();
    const networkErr = new TypeError('Failed to fetch');
    expect(retry(0, networkErr)).toBe(true);
    expect(retry(2, networkErr)).toBe(false);
  });

  it('disables retries on mutations', () => {
    const client = createQueryClient();
    expect(client.getDefaultOptions().mutations?.retry).toBe(false);
  });
});
