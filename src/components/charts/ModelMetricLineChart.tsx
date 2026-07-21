'use client';

import { useMemo } from 'react';
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
              dot={false}
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
                dot={false}
                legendType="none"
                isAnimationActive={CHART_ENTER_ANIMATION}
              />
            ))}
        </LineChart>
      )}
    </ChartFrame>
  );
}
