'use client';

import { Box } from '@chakra-ui/react';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { usePrefersReducedMotion } from '@/hooks/ui/usePrefersReducedMotion';
import { qualitativeAt, rechartsTheme } from '@/theme';

import type { ModelUsage } from '@/features/usage/schemas';

export interface ModelBreakdownChartProps {
  data: readonly ModelUsage[];
  metric?: 'total_tokens' | 'requests' | 'credits';
  topN?: number;
  height?: number;
  minHeight?: number;
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
}: ModelBreakdownChartProps) {
  const reduced = usePrefersReducedMotion();

  // Copy before sorting — `data` comes from react-query and mutating the
  // cached array would silently desync later readers that expect server order.
  const rows = useMemo(
    () =>
      [...data].sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0)).slice(0, topN),
    [data, metric, topN],
  );

  return (
    <Box
      width="100%"
      height={`${height}px`}
      minHeight={`${minHeight}px`}
      role="figure"
      aria-label={`${METRIC_LABEL[metric]} by model`}
      data-testid="model-breakdown-chart"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
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
            isAnimationActive={!reduced}
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
