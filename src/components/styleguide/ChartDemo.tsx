'use client';

import { Box, HStack, Stack, Text, chakra } from '@chakra-ui/react';
import { useId, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ChartSkeleton } from '@/components/loading';
import { qualitativePalette, rechartsTheme } from '@/theme';

// Deterministic fake data — no network calls in the styleguide.
const areaData = [
  { day: 'Mon', requests: 2450, errors: 18 },
  { day: 'Tue', requests: 3120, errors: 24 },
  { day: 'Wed', requests: 2870, errors: 12 },
  { day: 'Thu', requests: 3640, errors: 31 },
  { day: 'Fri', requests: 4010, errors: 17 },
  { day: 'Sat', requests: 1840, errors: 6 },
  { day: 'Sun', requests: 1520, errors: 4 },
];

const barData = [
  { model: 'llama3.1', tokens: 184_203 },
  { model: 'mistral', tokens: 128_410 },
  { model: 'phi3', tokens: 91_284 },
  { model: 'qwen2', tokens: 64_003 },
  { model: 'codellama', tokens: 48_221 },
];

/**
 * Pair of demo charts using the qualitative palette + rechartsTheme tokens.
 * A "Show loading" toggle swaps in `ChartSkeleton` so the loading → loaded
 * transition can be eyeballed side-by-side without waiting for the network.
 */
export function ChartDemo() {
  const [loading, setLoading] = useState(false);

  const accent = qualitativePalette[0] ?? '#60a5fa';
  const accent2 = qualitativePalette[1] ?? '#a78bfa';

  // `useId` is stable across renders AND SSR/CSR handoff; React guarantees
  // uniqueness without the purity-warning baggage of Math.random.
  const reactId = useId();
  const areaGradientId = `sg-area-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <Stack gap="4">
      <HStack gap="3">
        <chakra.button
          type="button"
          data-testid="chart-loading-toggle"
          onClick={() => setLoading((v) => !v)}
          height="28px"
          paddingInline="3"
          borderRadius="md"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="border.glass"
          background="bg.glass.subtle"
          color="fg.default"
          fontSize="sm"
          fontWeight="medium"
          cursor="pointer"
        >
          {loading ? 'Show data' : 'Show loading'}
        </chakra.button>
        <Text textStyle="caption" color="fg.subtle">
          Toggles `ChartSkeleton` swap — layout should not shift.
        </Text>
      </HStack>

      <Box
        display="grid"
        gridTemplateColumns={{ base: '1fr', md: '1fr 1fr' }}
        gap="4"
      >
        <Stack gap="2">
          <Text textStyle="heading.sm">Requests / day</Text>
          {loading ? (
            <ChartSkeleton height={240} />
          ) : (
            <Box height="240px">
              <ResponsiveContainer>
                <AreaChart data={areaData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={accent} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke={rechartsTheme.grid.stroke}
                    strokeDasharray={rechartsTheme.grid.strokeDasharray}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
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
                    width={48}
                  />
                  <Tooltip
                    contentStyle={rechartsTheme.tooltip.contentStyle}
                    labelStyle={rechartsTheme.tooltip.labelStyle}
                    cursor={{ stroke: rechartsTheme.grid.stroke }}
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke={accent}
                    strokeWidth={2}
                    fill={`url(#${areaGradientId})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Stack>

        <Stack gap="2">
          <Text textStyle="heading.sm">Tokens / model</Text>
          {loading ? (
            <ChartSkeleton height={240} />
          ) : (
            <Box height="240px">
              <ResponsiveContainer>
                <BarChart data={barData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
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
                  <Bar dataKey="tokens" fill={accent2} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
