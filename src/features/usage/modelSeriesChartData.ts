import type { ModelSeries, ModelSeriesBucket } from './schemas';

// Numeric metric fields of a per-model bucket (everything except the bucket
// timestamp itself).
export type ModelMetricKey = Exclude<keyof ModelSeriesBucket, 'bucket'>;

/**
 * One chart row per bucket. Values live under `m[model][metric]` rather than
 * as flat `row[model]` keys: model names routinely contain dots
 * ("llama3.1:8b"), which recharts string dataKeys would parse as nested
 * paths — charts must therefore read cells with FUNCTION dataKeys, e.g.
 * `(row) => row.m[model]?.[metric] ?? null`.
 */
export interface ModelSeriesChartRow {
  bucket: string;
  m: Record<string, Partial<Record<ModelMetricKey, number | null>>>;
}

/**
 * Pivot per-model series into chart rows keyed by bucket. Metric values pass
 * through untouched except for optional per-metric down-scaling (ms → s);
 * nulls stay null so lines render gaps — a null speed is "no completed
 * requests", which must never plot as zero. Rows sort ascending by bucket
 * even if a series arrives out of order, and a model missing a bucket simply
 * has no cell in that row (ragged input is a backend bug, but the chart
 * degrades to a gap instead of crashing).
 */
export function pivotModelSeries(
  series: readonly ModelSeries[],
  metrics: readonly ModelMetricKey[],
  scaleByMetric: Partial<Record<ModelMetricKey, number>> = {},
): ModelSeriesChartRow[] {
  const rows = new Map<string, ModelSeriesChartRow>();
  for (const s of series) {
    for (const b of s.buckets) {
      let row = rows.get(b.bucket);
      if (!row) {
        row = { bucket: b.bucket, m: {} };
        rows.set(b.bucket, row);
      }
      const cell: Partial<Record<ModelMetricKey, number | null>> = {};
      for (const metric of metrics) {
        const v = b[metric];
        // avg_duration_ms is 0 (not null) on the wire for zero-request
        // buckets, but an average over nothing is undefined — plotting it
        // would draw a "0s latency" dip for pure inactivity. Genuine zero
        // durations (requests > 0) pass through.
        if (metric === 'avg_duration_ms' && b.requests === 0) {
          cell[metric] = null;
          continue;
        }
        cell[metric] = v === null ? null : v / (scaleByMetric[metric] ?? 1);
      }
      row.m[s.model] = cell;
    }
  }
  const orderKey = (bucket: string): number => {
    const ms = Date.parse(bucket);
    return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
  };
  return [...rows.values()].sort(
    (a, b) => orderKey(a.bucket) - orderKey(b.bucket),
  );
}

/**
 * True when the sample at `index` has a value but both neighbors don't —
 * recharts draws no line segment for it, and without a marker a real
 * measurement would be invisible (common for sparse speed/p95 series, or a
 * one-bucket window). Charts render a dot exactly for these samples.
 */
export function isIsolatedSample(
  rows: readonly ModelSeriesChartRow[],
  model: string,
  metric: ModelMetricKey,
  index: number,
): boolean {
  const value = rows[index]?.m[model]?.[metric];
  if (value === null || value === undefined) return false;
  const prev = index > 0 ? rows[index - 1]?.m[model]?.[metric] : undefined;
  const next =
    index < rows.length - 1 ? rows[index + 1]?.m[model]?.[metric] : undefined;
  return (prev === null || prev === undefined) && (next === null || next === undefined);
}

/**
 * Stable model → palette-index order shared by every chart on the page, so
 * "llama3.1:8b" is the same color in the tokens bar chart and the speed line
 * chart. Series order (backend: window token totals desc) wins; models that
 * appear only in the aggregate table (e.g. beyond the series cap) append
 * after, deduplicated.
 */
export function buildModelColorOrder(
  seriesModels: readonly string[],
  tableModels: readonly string[],
): string[] {
  const out: string[] = [];
  for (const model of [...seriesModels, ...tableModels]) {
    if (!out.includes(model)) out.push(model);
  }
  return out;
}
