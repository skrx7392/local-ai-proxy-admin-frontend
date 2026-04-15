'use client';

import { Badge, Stack, Text } from '@chakra-ui/react';
import type { ColumnDef } from '@tanstack/react-table';

import type { ModelUsage, OwnerType, OwnerUsageRow } from './schemas';

const nf = new Intl.NumberFormat(undefined);
const cf = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function OwnerTypeBadge({ type }: { type: OwnerType }) {
  const palette =
    type === 'user' ? 'blue' : type === 'service' ? 'purple' : 'gray';
  return (
    <Badge colorPalette={palette} data-testid={`owner-type-${type}`}>
      {type}
    </Badge>
  );
}

// Human-readable owner label with explicit fallback for unattributed rows.
// Per PLAN.md: users render by email, services by account_name, and
// `unattributed` is shown literally rather than left as "—" so legacy
// admin-created keys aren't confused with missing data.
function ownerLabel(row: OwnerUsageRow): string {
  if (row.owner_type === 'user') {
    if (row.email) return row.name ? `${row.name} (${row.email})` : row.email;
    return `user #${row.user_id ?? '?'}`;
  }
  if (row.owner_type === 'service') {
    return row.account_name ?? `account #${row.account_id ?? '?'}`;
  }
  return 'unattributed';
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
      header: 'Avg ms',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <Text
          fontVariantNumeric="tabular-nums"
          textAlign="right"
          color="fg.muted"
        >
          {nf.format(Math.round(row.original.avg_duration_ms))}
        </Text>
      ),
    },
  ];
}

export function buildOwnerUsageColumns(): ColumnDef<OwnerUsageRow, unknown>[] {
  return [
    {
      id: 'type',
      header: 'Type',
      size: 120,
      cell: ({ row }) => <OwnerTypeBadge type={row.original.owner_type} />,
    },
    {
      id: 'owner',
      header: 'Owner',
      cell: ({ row }) => (
        <Stack gap="0.5">
          <Text fontSize="sm">{ownerLabel(row.original)}</Text>
          {row.original.account_type && (
            <Text fontSize="xs" color="fg.muted">
              {row.original.account_type}
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
