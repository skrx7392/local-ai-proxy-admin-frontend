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

  it('parses the nodes breakdown (Distributed Nodes)', () => {
    const parsed = AdminHealthSchema.parse({
      status: 'ok',
      checks: {},
      uptime_seconds: 0,
      version: 'x',
      nodes: [
        {
          name: 'workstation',
          health: 'healthy',
          last_checked_at: '2026-07-07T10:00:00Z',
          model_count: 2,
        },
        {
          name: 'cloud',
          health: 'unhealthy',
          last_error: 'dial tcp: connection refused',
          last_checked_at: null,
          model_count: 0,
        },
      ],
    });
    expect(parsed.nodes).toHaveLength(2);
    expect(parsed.nodes?.[1]?.last_error).toContain('refused');
  });

  it('parses the zero-node warning', () => {
    const parsed = AdminHealthSchema.parse({
      status: 'ok',
      checks: {},
      uptime_seconds: 0,
      version: 'x',
      nodes: [],
      warning: 'no nodes configured',
    });
    expect(parsed.warning).toBe('no nodes configured');
  });

  it('still accepts a snapshot without nodes/warning (pre-registry backend)', () => {
    const parsed = AdminHealthSchema.parse({
      status: 'ok',
      checks: {},
      uptime_seconds: 0,
      version: 'x',
    });
    expect(parsed.nodes).toBeUndefined();
    expect(parsed.warning).toBeUndefined();
  });

  it('rejects an invalid node health value', () => {
    expect(() =>
      AdminHealthSchema.parse({
        status: 'ok',
        checks: {},
        uptime_seconds: 0,
        version: 'x',
        nodes: [
          {
            name: 'n',
            health: 'flapping',
            last_checked_at: null,
            model_count: 0,
          },
        ],
      }),
    ).toThrow();
  });
});
