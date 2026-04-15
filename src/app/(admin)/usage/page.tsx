'use client';

import {
  Alert,
  Box,
  Container,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
} from '@chakra-ui/react';
import { useMemo } from 'react';

import { DataTable, EmptyState, Pagination } from '@/components/data';
import {
  ModelBreakdownChart,
  StatCard,
  TimeseriesChart,
} from '@/components/charts';
import { ChartSkeleton, DataTableSkeleton } from '@/components/loading';
import {
  buildModelUsageColumns,
  buildOwnerUsageColumns,
} from '@/features/usage/columns';
import {
  canonicalizeTimeseriesFilters,
  canonicalizeUsageFilters,
} from '@/features/usage/filters';
import {
  useUsageByModel,
  useUsageByUser,
  useUsageSummary,
  useUsageTimeseries,
} from '@/features/usage/hooks';
import type {
  ModelUsage,
  OwnerUsageRow,
} from '@/features/usage/schemas';
import { UsageFilterControls } from '@/features/usage/UsageFilterControls';
import {
  readTimeseriesFiltersFromUrl,
  readUsageFiltersFromUrl,
} from '@/features/usage/url';
import { ApiError } from '@/lib/api/errors';
import { readEnum, readInt, useListSearchParams } from '@/lib/url/listState';

const TAB_VALUES = ['summary', 'by-model', 'by-user', 'timeseries'] as const;

const nf = new Intl.NumberFormat(undefined);
const cf = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function UsagePage() {
  const { searchParams, update } = useListSearchParams();

  const tab = readEnum(searchParams, 'tab', TAB_VALUES, 'summary');
  const limit = readInt(searchParams, 'limit', 25);
  const offset = readInt(searchParams, 'offset', 0);

  const filters = useMemo(
    () => readUsageFiltersFromUrl(searchParams),
    [searchParams],
  );
  const timeseriesFilters = useMemo(
    () => readTimeseriesFiltersFromUrl(searchParams),
    [searchParams],
  );

  return (
    <Container maxW="7xl" paddingBlock="8" paddingInline="6">
      <Stack gap="6">
        <Box>
          <Heading textStyle="heading.md">Usage</Heading>
          <Text color="fg.muted" textStyle="body.sm">
            Aggregate traffic, model mix, and per-owner consumption. Filters
            apply to every tab.
          </Text>
        </Box>

        <UsageFilterControls
          filters={filters}
          onChange={update}
          showInterval={tab === 'timeseries'}
          interval={timeseriesFilters.interval}
        />

        <Tabs.Root
          value={tab}
          onValueChange={(details) =>
            update({ tab: details.value, offset: null }, { resetOffset: true })
          }
          lazyMount
          unmountOnExit
        >
          <Tabs.List>
            <Tabs.Trigger value="summary" data-testid="usage-tab-summary">
              Summary
            </Tabs.Trigger>
            <Tabs.Trigger value="by-model" data-testid="usage-tab-by-model">
              By model
            </Tabs.Trigger>
            <Tabs.Trigger value="by-user" data-testid="usage-tab-by-user">
              By user
            </Tabs.Trigger>
            <Tabs.Trigger value="timeseries" data-testid="usage-tab-timeseries">
              Timeseries
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="summary">
            <SummaryPanel filters={filters} />
          </Tabs.Content>
          <Tabs.Content value="by-model">
            <ByModelPanel
              filters={filters}
              limit={limit}
              offset={offset}
              onPageChange={(l, o) =>
                update({ limit: l, offset: o || null })
              }
            />
          </Tabs.Content>
          <Tabs.Content value="by-user">
            <ByUserPanel
              filters={filters}
              limit={limit}
              offset={offset}
              onPageChange={(l, o) =>
                update({ limit: l, offset: o || null })
              }
            />
          </Tabs.Content>
          <Tabs.Content value="timeseries">
            <TimeseriesPanel filters={timeseriesFilters} />
          </Tabs.Content>
        </Tabs.Root>
      </Stack>
    </Container>
  );
}

function SummaryPanel({
  filters,
}: {
  filters: ReturnType<typeof readUsageFiltersFromUrl>;
}) {
  const canonical = useMemo(() => canonicalizeUsageFilters(filters), [filters]);
  const summary = useUsageSummary(canonical);

  if (!canonical) return <InvalidRange />;

  const data = summary.data;
  const loading = summary.isLoading;

  return (
    <Stack gap="4" paddingTop="4">
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap="4">
        <StatCard
          label="Requests"
          value={data ? nf.format(data.requests) : '—'}
          isLoading={loading}
          testId="usage-stat-requests"
        />
        <StatCard
          label="Total tokens"
          value={data ? nf.format(data.total_tokens) : '—'}
          hint={
            data
              ? `${nf.format(data.prompt_tokens)} prompt / ${nf.format(data.completion_tokens)} completion`
              : undefined
          }
          isLoading={loading}
          testId="usage-stat-tokens"
        />
        <StatCard
          label="Credits"
          value={data ? `$${cf.format(data.credits)}` : '—'}
          isLoading={loading}
          testId="usage-stat-credits"
        />
        <StatCard
          label="Errors"
          value={data ? nf.format(data.errors) : '—'}
          hint={
            data && data.requests > 0
              ? `${((data.errors / data.requests) * 100).toFixed(2)}% of requests`
              : undefined
          }
          isLoading={loading}
          testId="usage-stat-errors"
        />
      </SimpleGrid>
      {data && (
        <HStack gap="6" color="fg.muted">
          <Text textStyle="body.sm">
            Avg duration: {nf.format(Math.round(data.avg_duration_ms))} ms
          </Text>
        </HStack>
      )}
      {summary.error && <ErrorAlert error={summary.error} />}
    </Stack>
  );
}

function ByModelPanel({
  filters,
  limit,
  offset,
  onPageChange,
}: {
  filters: ReturnType<typeof readUsageFiltersFromUrl>;
  limit: number;
  offset: number;
  onPageChange: (limit: number, offset: number) => void;
}) {
  const canonical = useMemo(() => canonicalizeUsageFilters(filters), [filters]);
  const query = useUsageByModel(canonical);
  const columns = useMemo(() => buildModelUsageColumns(), []);

  if (!canonical) return <InvalidRange />;
  const rows = query.data?.data ?? [];
  const total = query.data?.pagination.total ?? 0;

  return (
    <Stack gap="4" paddingTop="4">
      {query.isLoading ? (
        <ChartSkeleton height={240} />
      ) : rows.length > 0 ? (
        <ModelBreakdownChart data={rows} />
      ) : null}

      {query.isLoading ? (
        <DataTableSkeleton rows={5} />
      ) : (
        <DataTable<ModelUsage>
          data={rows}
          columns={columns}
          getRowId={(r) => r.model}
          aria-label="Usage by model"
          emptyState={<EmptyState title="No usage in this range" />}
        />
      )}
      <Pagination
        limit={limit}
        offset={offset}
        total={total}
        pageRowCount={rows.length}
        onChange={({ limit: l, offset: o }) => onPageChange(l, o)}
        isLoading={query.isFetching}
      />
      {query.error && <ErrorAlert error={query.error} />}
    </Stack>
  );
}

function ByUserPanel({
  filters,
  limit,
  offset,
  onPageChange,
}: {
  filters: ReturnType<typeof readUsageFiltersFromUrl>;
  limit: number;
  offset: number;
  onPageChange: (limit: number, offset: number) => void;
}) {
  const canonical = useMemo(() => canonicalizeUsageFilters(filters), [filters]);
  const query = useUsageByUser(canonical);
  const columns = useMemo(() => buildOwnerUsageColumns(), []);

  if (!canonical) return <InvalidRange />;
  const rows = query.data?.data ?? [];
  const total = query.data?.pagination.total ?? 0;

  return (
    <Stack gap="4" paddingTop="4">
      {query.isLoading ? (
        <DataTableSkeleton rows={5} />
      ) : (
        <DataTable<OwnerUsageRow>
          data={rows}
          columns={columns}
          getRowId={(row) =>
            row.owner_type === 'user'
              ? `u:${row.user_id ?? 'x'}`
              : row.owner_type === 'service'
                ? `s:${row.account_id ?? 'x'}`
                : `un:${row.user_id ?? 'x'}:${row.account_id ?? 'x'}`
          }
          aria-label="Usage by owner"
          emptyState={<EmptyState title="No usage in this range" />}
        />
      )}
      <Pagination
        limit={limit}
        offset={offset}
        total={total}
        pageRowCount={rows.length}
        onChange={({ limit: l, offset: o }) => onPageChange(l, o)}
        isLoading={query.isFetching}
      />
      {query.error && <ErrorAlert error={query.error} />}
    </Stack>
  );
}

function TimeseriesPanel({
  filters,
}: {
  filters: ReturnType<typeof readTimeseriesFiltersFromUrl>;
}) {
  const canonical = useMemo(
    () => canonicalizeTimeseriesFilters(filters),
    [filters],
  );
  const query = useUsageTimeseries(canonical);

  if (!canonical) return <InvalidRange />;

  return (
    <Stack gap="4" paddingTop="4">
      {query.isLoading ? (
        <ChartSkeleton height={320} />
      ) : query.data ? (
        <TimeseriesChart
          buckets={query.data.buckets}
          interval={query.data.interval}
          series={['requests', 'errors']}
          height={320}
        />
      ) : null}
      {query.error && <ErrorAlert error={query.error} />}
    </Stack>
  );
}

function InvalidRange() {
  return (
    <Alert.Root status="warning" paddingTop="4" data-testid="usage-invalid-range">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>Invalid date range</Alert.Title>
        <Alert.Description>
          Pick a start time before the end time to run a query.
        </Alert.Description>
      </Alert.Content>
    </Alert.Root>
  );
}

function ErrorAlert({ error }: { error: Error }) {
  const message =
    error instanceof ApiError ? error.message : 'Something went wrong.';
  return (
    <Alert.Root status="error" data-testid="usage-error">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>Request failed</Alert.Title>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert.Root>
  );
}
