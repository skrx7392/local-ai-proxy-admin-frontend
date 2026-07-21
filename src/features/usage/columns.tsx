'use client';

import { Badge, Stack, Text } from '@chakra-ui/react';
import type { ColumnDef } from '@tanstack/react-table';

import type { AccountType, AccountUsageRow, ModelUsage } from './schemas';

const nf = new Intl.NumberFormat(undefined);
const cf = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
// Average request latency is stored in milliseconds but reads far better in
// seconds (41,720 → "41.7"); the unit lives in the column header so the cells
// stay unit-free and right-aligned for scanning.
const secondsFmt = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
// Generation speed in tokens/sec (88.4, 24.6, …). One decimal is enough
// resolution to compare models without implying benchmark precision.
const rateFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

// Speed and latency percentiles are null for models with no completed
// requests — render an explicit dash, never 0 (0 would read as "instant").
function MetricDash() {
  return (
    <Text color="fg.muted" aria-label="not available">
      —
    </Text>
  );
}

// NULL account_type = the unattributed bucket (legacy admin keys with no
// account). Rendered literally as "unattributed" rather than "—" so it isn't
// confused with missing data.
function AccountTypeBadge({ type }: { type: AccountType | null }) {
  const label = type ?? 'unattributed';
  const palette =
    type === 'personal'
      ? 'blue'
      : type === 'service'
        ? 'purple'
        : type === 'end_user'
          ? 'teal'
          : 'gray';
  return (
    <Badge colorPalette={palette} data-testid={`account-type-${label}`}>
      {label}
    </Badge>
  );
}

function accountLabel(row: AccountUsageRow): string {
  if (row.account_id === null) return 'unattributed';
  return row.account_name ?? `account #${row.account_id}`;
}

export function buildModelUsageColumns(): ColumnDef<ModelUsage, unknown>[] {
  return [
    {
      accessorKey: 'model',
      header: 'Model',
      cell: ({ row }) => (
        <Text fontFamily="mono" fontSize="sm">
          {row.original.model}
        </Text>
      ),
    },
    {
      accessorKey: 'requests',
      header: 'Requests',
      meta: { align: 'center' },
      cell: ({ row }) => (
        <Text fontVariantNumeric="tabular-nums">
          {nf.format(row.original.requests)}
        </Text>
      ),
    },
    {
      accessorKey: 'total_tokens',
      header: 'Tokens',
      meta: { align: 'center' },
      cell: ({ row }) => (
        <Stack gap="0.5" align="center">
          <Text fontVariantNumeric="tabular-nums">
            {nf.format(row.original.total_tokens)}
          </Text>
          <Text fontSize="xs" color="fg.muted" fontVariantNumeric="tabular-nums">
            {nf.format(row.original.prompt_tokens)} in ·{' '}
            {nf.format(row.original.completion_tokens)} out
          </Text>
        </Stack>
      ),
    },
    {
      accessorKey: 'credits',
      header: 'Credits',
      meta: { align: 'center' },
      cell: ({ row }) => (
        <Text fontVariantNumeric="tabular-nums">
          ${cf.format(row.original.credits)}
        </Text>
      ),
    },
    {
      accessorKey: 'tok_per_sec',
      header: 'Speed (tok/s)',
      meta: { align: 'center' },
      cell: ({ row }) =>
        row.original.tok_per_sec === null ? (
          <MetricDash />
        ) : (
          <Text fontVariantNumeric="tabular-nums">
            {rateFmt.format(row.original.tok_per_sec)}
          </Text>
        ),
    },
    {
      accessorKey: 'avg_duration_ms',
      header: 'Avg (s)',
      meta: { align: 'center' },
      cell: ({ row }) => (
        <Text fontVariantNumeric="tabular-nums" color="fg.muted">
          {secondsFmt.format(row.original.avg_duration_ms / 1000)}
        </Text>
      ),
    },
    {
      accessorKey: 'p95_duration_ms',
      header: 'P95 (s)',
      meta: { align: 'center' },
      cell: ({ row }) =>
        row.original.p95_duration_ms === null ? (
          <MetricDash />
        ) : (
          <Text fontVariantNumeric="tabular-nums" color="fg.muted">
            {secondsFmt.format(row.original.p95_duration_ms / 1000)}
          </Text>
        ),
    },
    {
      accessorKey: 'error_count',
      header: 'Errors',
      meta: { align: 'center' },
      cell: ({ row }) => (
        <Stack gap="0.5" align="center">
          <Text
            fontVariantNumeric="tabular-nums"
            color={row.original.error_count > 0 ? 'fg.error' : 'fg.muted'}
          >
            {nf.format(row.original.error_count)}
          </Text>
          {row.original.partial_count > 0 && (
            <Text fontSize="xs" color="fg.muted" fontVariantNumeric="tabular-nums">
              +{nf.format(row.original.partial_count)} partial
            </Text>
          )}
        </Stack>
      ),
    },
  ];
}

export function buildAccountUsageColumns(): ColumnDef<AccountUsageRow, unknown>[] {
  return [
    {
      id: 'type',
      header: 'Type',
      size: 120,
      cell: ({ row }) => <AccountTypeBadge type={row.original.account_type} />,
    },
    {
      id: 'account',
      header: 'Account',
      cell: ({ row }) => (
        <Stack gap="0.5">
          <Text fontSize="sm">{accountLabel(row.original)}</Text>
          {/* end_user account names default to the email — skip the echo. */}
          {row.original.email &&
            row.original.email !== row.original.account_name && (
              <Text fontSize="xs" color="fg.muted">
                {row.original.email}
              </Text>
            )}
        </Stack>
      ),
    },
    {
      accessorKey: 'requests',
      header: 'Requests',
      meta: { align: 'center' },
      cell: ({ row }) => (
        <Text fontVariantNumeric="tabular-nums">
          {nf.format(row.original.requests)}
        </Text>
      ),
    },
    {
      accessorKey: 'total_tokens',
      header: 'Tokens',
      meta: { align: 'center' },
      cell: ({ row }) => (
        <Text fontVariantNumeric="tabular-nums">
          {nf.format(row.original.total_tokens)}
        </Text>
      ),
    },
    {
      accessorKey: 'credits',
      header: 'Credits',
      meta: { align: 'center' },
      cell: ({ row }) => (
        <Text fontVariantNumeric="tabular-nums">
          ${cf.format(row.original.credits)}
        </Text>
      ),
    },
    {
      accessorKey: 'key_count',
      header: 'Keys',
      meta: { align: 'center' },
      size: 80,
      cell: ({ row }) => (
        <Text fontVariantNumeric="tabular-nums" color="fg.muted">
          {nf.format(row.original.key_count)}
        </Text>
      ),
    },
  ];
}
