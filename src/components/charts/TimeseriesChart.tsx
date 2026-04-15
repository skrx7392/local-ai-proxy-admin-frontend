'use client';

import { Box } from '@chakra-ui/react';
import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { usePrefersReducedMotion } from '@/hooks/ui/usePrefersReducedMotion';
import { qualitativeAt, rechartsTheme } from '@/theme';

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

function formatBucket(iso: string, interval: TimeseriesInterval): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (interval === 'day') {
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: '2-digit',
    });
  }
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TimeseriesChart({
  buckets,
  interval,
  series,
  height = 280,
  minHeight = 240,
  ariaLabel = 'Usage over time',
}: TimeseriesChartProps) {
  const reduced = usePrefersReducedMotion();

  // Recharts mutates the `data` array internally for some interactions; pass
  // a fresh copy so react-query's immutable cache is never mutated in place.
  const data = useMemo(
    () =>
      buckets.map((b) => ({
        ...b,
        bucketLabel: formatBucket(b.bucket, interval),
      })),
    [buckets, interval],
  );

  return (
    <Box
      width="100%"
      height={`${height}px`}
      minHeight={`${minHeight}px`}
      role="figure"
      aria-label={ariaLabel}
      data-testid="timeseries-chart"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid
            stroke={rechartsTheme.grid.stroke}
            strokeDasharray={rechartsTheme.grid.strokeDasharray}
            vertical={false}
          />
          <XAxis
            dataKey="bucketLabel"
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
              isAnimationActive={!reduced}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
