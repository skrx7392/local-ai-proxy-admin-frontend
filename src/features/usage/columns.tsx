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
      meta: { align: 'right' },
      cell: ({ row }) => (
        <Text fontVariantNumeric="tabular-nums" textAlign="right">
          {nf.format(row.original.requests)}
        </Text>
      ),
    },
    {
      accessorKey: 'total_tokens',
      header: 'Tokens',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <Text fontVariantNumeric="tabular-nums" textAlign="right">
          {nf.format(row.original.total_tokens)}
        </Text>
      ),
    },
    {
      accessorKey: 'credits',
      header: 'Credits',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <Text fontVariantNumeric="tabular-nums" textAlign="right">
          ${cf.format(row.original.credits)}
        </Text>
      ),
    },
    {
      accessorKey: 'avg_duration_ms',
      header: 'Avg (s)',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <Text
          fontVariantNumeric="tabular-nums"
          textAlign="right"
          color="fg.muted"
        >
          {secondsFmt.format(row.original.avg_duration_ms / 1000)}
        </Text>
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
      meta: { align: 'right' },
      cell: ({ row }) => (
        <Text fontVariantNumeric="tabular-nums" textAlign="right">
          {nf.format(row.original.requests)}
        </Text>
      ),
    },
    {
      accessorKey: 'total_tokens',
      header: 'Tokens',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <Text fontVariantNumeric="tabular-nums" textAlign="right">
          {nf.format(row.original.total_tokens)}
        </Text>
      ),
    },
    {
      accessorKey: 'credits',
      header: 'Credits',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <Text fontVariantNumeric="tabular-nums" textAlign="right">
          ${cf.format(row.original.credits)}
        </Text>
      ),
    },
    {
      accessorKey: 'key_count',
      header: 'Keys',
      meta: { align: 'right' },
      size: 80,
      cell: ({ row }) => (
        <Text
          fontVariantNumeric="tabular-nums"
          textAlign="right"
          color="fg.muted"
        >
          {nf.format(row.original.key_count)}
        </Text>
      ),
    },
  ];
}
