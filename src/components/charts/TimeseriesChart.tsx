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
  buildTimeseriesChartData,
  formatBucketTick,
  formatBucketTooltipLabel,
} from '@/features/usage/timeseriesChartData';
import { qualitativeAt, rechartsTheme } from '@/theme';

import { CHART_ENTER_ANIMATION, ChartFrame } from './ChartFrame';

import type { TimeseriesBucket, TimeseriesInterval } from '@/features/usage/schemas';

export type TimeseriesSeriesKey =
  | 'requests'
  | 'total_tokens'
  | 'prompt_tokens'
  | 'completion_tokens'
  | 'credits'
  | 'errors';

export interface TimeseriesChartProps {
  buckets: readonly TimeseriesBucket[];
  interval: TimeseriesInterval;
  // Which numeric fields to render as lines. Ordered, so palette assignment
  // is stable regardless of which caller is drawing the chart.
  series: readonly TimeseriesSeriesKey[];
  height?: number;
  minHeight?: number;
  ariaLabel?: string;
}

const SERIES_LABEL: Record<TimeseriesSeriesKey, string> = {
  requests: 'Requests',
  total_tokens: 'Total tokens',
  prompt_tokens: 'Prompt tokens',
  completion_tokens: 'Completion tokens',
  credits: 'Credits',
  errors: 'Errors',
};

export function TimeseriesChart({
  buckets,
  interval,
  series,
  height = 280,
  minHeight = 240,
  ariaLabel = 'Usage over time',
}: TimeseriesChartProps) {
  // Fresh, sorted copy keyed on the unique ISO bucket (recharts mutates its
  // `data` internally, and the input belongs to react-query's cache). Labels
  // are formatting-only concerns applied at the axis/tooltip boundary.
  const data = useMemo(() => buildTimeseriesChartData(buckets), [buckets]);

  return (
    <ChartFrame
      height={height}
      minHeight={minHeight}
      ariaLabel={ariaLabel}
      testId="timeseries-chart"
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
          {series.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={SERIES_LABEL[key]}
              stroke={qualitativeAt(i)}
              strokeWidth={2}
              dot={false}
              isAnimationActive={CHART_ENTER_ANIMATION}
            />
          ))}
        </LineChart>
      )}
    </ChartFrame>
  );
}
