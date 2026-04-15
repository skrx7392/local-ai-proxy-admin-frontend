import { describe, expect, it } from 'vitest';

import { AdminHealthSchema } from '../schemas';

describe('AdminHealthSchema', () => {
  it('parses an all-ok snapshot', () => {
    const parsed = AdminHealthSchema.parse({
      status: 'ok',
      checks: {
        db: { status: 'ok', latency_ms: 3 },
        ollama: { status: 'ok', latency_ms: 18 },
        usage_writer: { status: 'ok', queue_depth: 0, queue_capacity: 1000 },
      },
      uptime_seconds: 1234,
      version: 'abc1234',
    });
    expect(parsed.status).toBe('ok');
    expect(Object.keys(parsed.checks)).toEqual([
      'db',
      'ollama',
      'usage_writer',
    ]);
  });

  it('parses a degraded snapshot with an error message', () => {
    const parsed = AdminHealthSchema.parse({
      status: 'degraded',
      checks: {
        db: { status: 'ok', latency_ms: 4 },
        ollama: { status: 'error', latency_ms: 2000, error: 'timeout' },
      },
      uptime_seconds: 99,
      version: 'abc1234',
    });
    expect(parsed.status).toBe('degraded');
    expect(parsed.checks.ollama?.error).toBe('timeout');
  });

  it('rejects an invalid top-level status', () => {
    expect(() =>
      AdminHealthSchema.parse({
        status: 'broken',
        checks: {},
        uptime_seconds: 0,
        version: 'x',
      }),
    ).toThrow();
  });

  it('rejects a check with an invalid status value', () => {
    expect(() =>
      AdminHealthSchema.parse({
        status: 'ok',
        checks: { db: { status: 'unknown' } },
        uptime_seconds: 0,
        version: 'x',
      }),
    ).toThrow();
  });

  it('accepts an empty checks map', () => {
    const parsed = AdminHealthSchema.parse({
      status: 'ok',
      checks: {},
      uptime_seconds: 0,
      version: 'x',
    });
    expect(parsed.checks).toEqual({});
  });
});
