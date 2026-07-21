import { describe, expect, it } from 'vitest';

import type { ModelSeries } from '../schemas';
import {
  buildModelColorOrder,
  pivotModelSeries,
} from '../modelSeriesChartData';

const series: ModelSeries[] = [
  {
    model: 'llama3.1:8b',
    buckets: [
      {
        bucket: '2026-07-20T00:00:00Z',
        requests: 40,
        errors: 1,
        prompt_tokens: 8_000,
        completion_tokens: 16_000,
        total_tokens: 24_000,
        credits: 0.4,
        tok_per_sec: 85.2,
        avg_duration_ms: 300,
        p95_duration_ms: 610,
      },
      {
        bucket: '2026-07-20T01:00:00Z',
        requests: 52,
        errors: 0,
        prompt_tokens: 9_000,
        completion_tokens: 19_000,
        total_tokens: 28_000,
        credits: 0.5,
        tok_per_sec: 90.1,
        avg_duration_ms: 310,
        p95_duration_ms: 640,
      },
    ],
  },
  {
    model: 'llama3.1:70b',
    buckets: [
      // Gap-filled bucket: zero counts, null speed/p95.
      {
        bucket: '2026-07-20T00:00:00Z',
        requests: 0,
        errors: 0,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        credits: 0,
        tok_per_sec: null,
        avg_duration_ms: 0,
        p95_duration_ms: null,
      },
      {
        bucket: '2026-07-20T01:00:00Z',
        requests: 12,
        errors: 1,
        prompt_tokens: 3_000,
        completion_tokens: 1_500,
        total_tokens: 4_500,
        credits: 0.2,
        tok_per_sec: 24.1,
        avg_duration_ms: 1_500,
        p95_duration_ms: 2_400,
      },
    ],
  },
];

describe('pivotModelSeries', () => {
  it('pivots aligned series into one row per bucket keyed by model', () => {
    const rows = pivotModelSeries(series, ['requests']);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.bucket).toBe('2026-07-20T00:00:00Z');
    expect(rows[0]?.m['llama3.1:8b']?.requests).toBe(40);
    expect(rows[0]?.m['llama3.1:70b']?.requests).toBe(0);
    expect(rows[1]?.m['llama3.1:8b']?.requests).toBe(52);
  });

  it('keeps null metric cells null so charts render gaps, never zero', () => {
    const rows = pivotModelSeries(series, ['tok_per_sec']);
    expect(rows[0]?.m['llama3.1:70b']?.tok_per_sec).toBeNull();
    expect(rows[1]?.m['llama3.1:70b']?.tok_per_sec).toBe(24.1);
  });

  it('applies per-metric scaling (ms → s) without touching nulls', () => {
    const rows = pivotModelSeries(series, ['p95_duration_ms'], {
      p95_duration_ms: 1000,
    });
    expect(rows[0]?.m['llama3.1:8b']?.p95_duration_ms).toBeCloseTo(0.61, 6);
    expect(rows[0]?.m['llama3.1:70b']?.p95_duration_ms).toBeNull();
  });

  it('nullifies avg latency for zero-request buckets (idle is not "0s fast")', () => {
    const rows = pivotModelSeries(series, ['avg_duration_ms'], {
      avg_duration_ms: 1000,
    });
    // 70b bucket 0 is a gap cell: requests 0, avg 0 on the wire → null.
    expect(rows[0]?.m['llama3.1:70b']?.avg_duration_ms).toBeNull();
    // Real traffic keeps its (scaled) average.
    expect(rows[1]?.m['llama3.1:70b']?.avg_duration_ms).toBeCloseTo(1.5, 6);
  });

  it('carries multiple metrics per cell for dual-line charts', () => {
    const rows = pivotModelSeries(series, ['prompt_tokens', 'completion_tokens']);
    expect(rows[0]?.m['llama3.1:8b']?.prompt_tokens).toBe(8_000);
    expect(rows[0]?.m['llama3.1:8b']?.completion_tokens).toBe(16_000);
  });

  it('sorts buckets ascending even when a series arrives out of order', () => {
    const shuffled: ModelSeries[] = [
      {
        model: 'x',
        buckets: [series[0]!.buckets[1]!, series[0]!.buckets[0]!],
      },
    ];
    const rows = pivotModelSeries(shuffled, ['requests']);
    expect(rows.map((r) => r.bucket)).toEqual([
      '2026-07-20T00:00:00Z',
      '2026-07-20T01:00:00Z',
    ]);
  });

  it('leaves a model absent from a bucket undefined (defensive vs ragged input)', () => {
    const ragged: ModelSeries[] = [
      series[0]!,
      { model: 'short', buckets: [series[1]!.buckets[1]!] },
    ];
    const rows = pivotModelSeries(ragged, ['requests']);
    expect(rows[0]?.m['short']).toBeUndefined();
    expect(rows[1]?.m['short']?.requests).toBe(12);
  });
});

describe('buildModelColorOrder', () => {
  it('prefers series order and appends table-only models without duplicates', () => {
    expect(
      buildModelColorOrder(
        ['llama3.1:8b', 'llama3.1:70b'],
        ['llama3.1:70b', 'gemma4:e2b'],
      ),
    ).toEqual(['llama3.1:8b', 'llama3.1:70b', 'gemma4:e2b']);
  });
});
