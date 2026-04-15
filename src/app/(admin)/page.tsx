'use client';

import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useMemo } from 'react';

import { StatCard, TimeseriesChart } from '@/components/charts';
import { ChartSkeleton } from '@/components/loading';
import {
  canonicalizeTimeseriesFilters,
  canonicalizeUsageFilters,
  quickPickRange,
} from '@/features/usage/filters';
import {
  useUsageSummary,
  useUsageTimeseries,
} from '@/features/usage/hooks';

const nf = new Intl.NumberFormat(undefined);
const cf = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function Page() {
  // Explicit 24h absolute range — do not rely on backend defaults. The range
  // is computed once on mount so subsequent re-renders (e.g. focus) don't
  // shift it mid-session; refreshing the page picks up a fresh window.
  const range = useMemo(() => quickPickRange('24h'), []);

  const summaryFilters = useMemo(
    () => canonicalizeUsageFilters(range),
    [range],
  );
  const timeseriesFilters = useMemo(
    () => canonicalizeTimeseriesFilters({ ...range, interval: 'hour' }),
    [range],
  );

  // Two independent queries: the summary StatCards must not wait on the
  // chart's data, and vice versa.
  const summary = useUsageSummary(summaryFilters);
  const timeseries = useUsageTimeseries(timeseriesFilters);

  return (
    <Container maxW="7xl" paddingBlock="8" paddingInline="6">
      <Stack gap="6">
        <Box>
          <Heading textStyle="heading.md">Dashboard</Heading>
          <Text color="fg.muted" textStyle="body.sm">
            Last 24 hours across the whole proxy.{' '}
            <NextLink
              href="/usage"
              data-testid="dashboard-open-usage"
              style={{ textDecoration: 'underline' }}
            >
              Open full analytics
            </NextLink>
            .
          </Text>
        </Box>

        <SimpleGrid
          columns={{ base: 1, md: 2, lg: 4 }}
          gap="4"
          data-testid="dashboard-stat-grid"
        >
          <StatCard
            label="Requests"
            value={summary.data ? nf.format(summary.data.requests) : '—'}
            hint="last 24h"
            isLoading={summary.isLoading}
            testId="dashboard-stat-requests"
          />
          <StatCard
            label="Total tokens"
            value={summary.data ? nf.format(summary.data.total_tokens) : '—'}
            hint="last 24h"
            isLoading={summary.isLoading}
            testId="dashboard-stat-tokens"
          />
          <StatCard
            label="Credits"
            value={summary.data ? `$${cf.format(summary.data.credits)}` : '—'}
            hint="last 24h"
            isLoading={summary.isLoading}
            testId="dashboard-stat-credits"
          />
          <StatCard
            label="Errors"
            value={summary.data ? nf.format(summary.data.errors) : '—'}
            hint={
              summary.data && summary.data.requests > 0
                ? `${((summary.data.errors / summary.data.requests) * 100).toFixed(2)}% of requests`
                : 'last 24h'
            }
            isLoading={summary.isLoading}
            testId="dashboard-stat-errors"
          />
        </SimpleGrid>

        <Box
          borderWidth="1px"
          borderColor="border.glass"
          background="bg.glass.surface"
          backdropFilter="blur(18px) saturate(1.2)"
          borderRadius="lg"
          padding="4"
          data-testid="dashboard-timeseries"
        >
          <Stack gap="2">
            <Text textStyle="heading.sm">Requests per hour</Text>
            {timeseries.isLoading ? (
              <ChartSkeleton height={220} />
            ) : timeseries.data ? (
              <TimeseriesChart
                buckets={timeseries.data.buckets}
                interval={timeseries.data.interval}
                series={['requests']}
                height={220}
                minHeight={200}
                ariaLabel="Requests per hour (last 24h)"
              />
            ) : (
              <Text color="fg.muted">No data yet.</Text>
            )}
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}
