'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { qualitativeAt, rechartsTheme } from '@/theme';

import { CHART_ENTER_ANIMATION, ChartFrame } from './ChartFrame';

import type { ModelUsage } from '@/features/usage/schemas';

export interface ModelBreakdownChartProps {
  data: readonly ModelUsage[];
  metric?: 'total_tokens' | 'requests' | 'credits';
  topN?: number;
  height?: number;
  minHeight?: number;
  /**
   * Per-model bar color, shared with the page's other charts so a model
   * keeps one identity everywhere. Omitted = single palette color.
   */
  colorFor?: (model: string) => string;
  /** Override when a page renders more than one breakdown chart. */
  testId?: string;
}

const METRIC_LABEL: Record<
  NonNullable<ModelBreakdownChartProps['metric']>,
  string
> = {
  total_tokens: 'Total tokens',
  requests: 'Requests',
  credits: 'Credits',
};

export function ModelBreakdownChart({
  data,
  metric = 'total_tokens',
  topN = 10,
  height = 280,
  minHeight = 240,
  colorFor,
  testId = 'model-breakdown-chart',
}: ModelBreakdownChartProps) {
  // Copy before sorting — `data` comes from react-query and mutating the
  // cached array would silently desync later readers that expect server order.
  const rows = useMemo(
    () =>
      [...data].sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0)).slice(0, topN),
    [data, metric, topN],
  );

  return (
    <ChartFrame
      height={height}
      minHeight={minHeight}
      ariaLabel={`${METRIC_LABEL[metric]} by model`}
      testId={testId}
    >
      {({ width, height: chartHeight }) => (
        <BarChart
          width={width}
          height={chartHeight}
          data={rows}
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            stroke={rechartsTheme.grid.stroke}
            strokeDasharray={rechartsTheme.grid.strokeDasharray}
            vertical={false}
          />
          <XAxis
            dataKey="model"
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
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          <Bar
            dataKey={metric}
            name={METRIC_LABEL[metric]}
            fill={qualitativeAt(0)}
            radius={[4, 4, 0, 0]}
            isAnimationActive={CHART_ENTER_ANIMATION}
          >
            {colorFor &&
              rows.map((r) => <Cell key={r.model} fill={colorFor(r.model)} />)}
          </Bar>
        </BarChart>
      )}
    </ChartFrame>
  );
}
