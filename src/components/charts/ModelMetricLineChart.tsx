'use client';

import { useMemo, type Key } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  isIsolatedSample,
  pivotModelSeries,
  type ModelMetricKey,
  type ModelSeriesChartRow,
} from '@/features/usage/modelSeriesChartData';
import {
  formatBucketTick,
  formatBucketTooltipLabel,
} from '@/features/usage/timeseriesChartData';
import { rechartsTheme } from '@/theme';

import { CHART_ENTER_ANIMATION, ChartFrame } from './ChartFrame';

import type {
  ModelSeries,
  TimeseriesInterval,
} from '@/features/usage/schemas';

const METRIC_LABEL: Record<ModelMetricKey, string> = {
  requests: 'requests',
  errors: 'errors',
  prompt_tokens: 'in',
  completion_tokens: 'out',
  total_tokens: 'tokens',
  credits: 'credits',
  tok_per_sec: 'tok/s',
  avg_duration_ms: 'avg',
  p95_duration_ms: 'p95',
};

export interface ModelMetricLineChartProps {
  series: readonly ModelSeries[];
  interval: TimeseriesInterval;
  /** Solid line per model. */
  metric: ModelMetricKey;
  /** Optional dashed companion per model (same color): errors, out-tokens. */
  secondaryMetric?: ModelMetricKey;
  /** Divide values before plotting (1000 turns ms into s). */
  scale?: number;
  /** Shared model → color mapping so every chart on the page agrees. */
  colorFor: (model: string) => string;
  ariaLabel: string;
  height?: number;
  minHeight?: number;
  testId?: string;
}

// Recharts hands each dot its row index; a sample with null on both sides
// gets no connecting line segment, so it must render a visible marker or a
// real measurement disappears. Isolated indices are precomputed per line —
// dense lines skip the function dot entirely (dot={false}) and lines with
// isolated samples return null for every other point, so a 30d/hour window
// with 12 models never allocates tens of thousands of invisible nodes.
interface LineDotProps {
  key?: Key | null | undefined;
  cx?: number | undefined;
  cy?: number | undefined;
  index?: number | undefined;
}

function isolatedIndexSet(
  data: ModelSeriesChartRow[],
  model: string,
  metric: ModelMetricKey,
): ReadonlySet<number> {
  const out = new Set<number>();
  for (let i = 0; i < data.length; i++) {
    if (isIsolatedSample(data, model, metric, i)) out.add(i);
  }
  return out;
}

function makeIsolatedDot(isolated: ReadonlySet<number>, color: string) {
  return function IsolatedDot({ key, cx, cy, index }: LineDotProps) {
    if (
      cx === undefined ||
      cy === undefined ||
      index === undefined ||
      !isolated.has(index)
    ) {
      return null;
    }
    return <circle key={key} cx={cx} cy={cy} r={3} fill={color} />;
  };
}

function dotProp(
  isolated: ReadonlySet<number>,
  color: string,
): false | ReturnType<typeof makeIsolatedDot> {
  return isolated.size === 0 ? false : makeIsolatedDot(isolated, color);
}

export function ModelMetricLineChart({
  series,
  interval,
  metric,
  secondaryMetric,
  scale = 1,
  colorFor,
  ariaLabel,
  height = 240,
  minHeight = 200,
  testId = 'model-metric-line-chart',
}: ModelMetricLineChartProps) {
  const data = useMemo(() => {
    const metrics: ModelMetricKey[] = secondaryMetric
      ? [metric, secondaryMetric]
      : [metric];
    const scales: Partial<Record<ModelMetricKey, number>> = {};
    for (const m of metrics) scales[m] = scale;
    return pivotModelSeries(series, metrics, scales);
  }, [series, metric, secondaryMetric, scale]);

  // model → isolated sample indices, per rendered metric.
  const isolatedByLine = useMemo(() => {
    const out = new Map<string, ReadonlySet<number>>();
    for (const s of series) {
      out.set(`${s.model}:${metric}`, isolatedIndexSet(data, s.model, metric));
      if (secondaryMetric) {
        out.set(
          `${s.model}:${secondaryMetric}`,
          isolatedIndexSet(data, s.model, secondaryMetric),
        );
      }
    }
    return out;
  }, [data, series, metric, secondaryMetric]);

  return (
    <ChartFrame
      height={height}
      minHeight={minHeight}
      ariaLabel={ariaLabel}
      testId={testId}
    >
      {({ width, height: chartHeight }) => (
        <LineChart
          width={width}
          height={chartHeight}
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            stroke={rechartsTheme.grid.stroke}
            strokeDasharray={rechartsTheme.grid.strokeDasharray}
            vertical={false}
          />
          <XAxis
            dataKey="bucket"
            tickFormatter={(value: string) => formatBucketTick(value, interval)}
            stroke={rechartsTheme.axis.stroke}
            tick={rechartsTheme.axis.tick}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke={rechartsTheme.axis.stroke}
            tick={rechartsTheme.axis.tick}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            contentStyle={rechartsTheme.tooltip.contentStyle}
            labelStyle={rechartsTheme.tooltip.labelStyle}
            cursor={{ stroke: rechartsTheme.grid.stroke }}
            labelFormatter={(value) =>
              formatBucketTooltipLabel(String(value), interval)
            }
          />
          {series.length > 1 && <Legend />}
          {series.map((s) => (
            // Function dataKeys on purpose: model names contain dots, which
            // recharts string keys would treat as nested paths.
            <Line
              key={`${s.model}:${metric}`}
              type="monotone"
              dataKey={(row: ModelSeriesChartRow) =>
                row.m[s.model]?.[metric] ?? null
              }
              name={s.model}
              stroke={colorFor(s.model)}
              strokeWidth={2}
              dot={dotProp(
                isolatedByLine.get(`${s.model}:${metric}`) ?? new Set(),
                colorFor(s.model),
              )}
              isAnimationActive={CHART_ENTER_ANIMATION}
            />
          ))}
          {secondaryMetric &&
            series.map((s) => (
              <Line
                key={`${s.model}:${secondaryMetric}`}
                type="monotone"
                dataKey={(row: ModelSeriesChartRow) =>
                  row.m[s.model]?.[secondaryMetric] ?? null
                }
                name={`${s.model} (${METRIC_LABEL[secondaryMetric]})`}
                stroke={colorFor(s.model)}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={dotProp(
                  isolatedByLine.get(`${s.model}:${secondaryMetric}`) ??
                    new Set(),
                  colorFor(s.model),
                )}
                legendType="none"
                isAnimationActive={CHART_ENTER_ANIMATION}
              />
            ))}
        </LineChart>
      )}
    </ChartFrame>
  );
}
