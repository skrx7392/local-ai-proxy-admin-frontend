'use client';

import { Badge, Button, HStack, Link as ChakraLink, Text } from '@chakra-ui/react';
import type { ColumnDef } from '@tanstack/react-table';
import NextLink from 'next/link';

import { formatAbsoluteTime, formatRelativeTime } from '@/lib/utils/datetime';

import type { Key } from './schemas';

export function buildKeyColumns(options: {
  onRevoke: (key: Key) => void;
}): ColumnDef<Key, unknown>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <ChakraLink asChild fontWeight="medium">
          <NextLink
            href={`/keys/${row.original.id}`}
            data-testid={`key-name-${row.original.id}`}
          >
            {row.original.name}
          </NextLink>
        </ChakraLink>
      ),
    },
    {
      accessorKey: 'key_prefix',
      header: 'Prefix',
      cell: ({ row }) => (
        <Text fontFamily="mono" fontSize="xs" color="fg.muted">
          {row.original.key_prefix}…
        </Text>
      ),
    },
    {
      accessorKey: 'revoked',
      header: 'Status',
      cell: ({ row }) => {
        const active = !row.original.revoked;
        return (
          <Badge
            colorPalette={active ? 'green' : 'gray'}
            data-testid={`key-status-${row.original.id}`}
          >
            {active ? 'Active' : 'Revoked'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'rate_limit',
      header: 'Rate limit',
      cell: ({ row }) => (
        <Text>{row.original.rate_limit.toLocaleString()} req/min</Text>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <Text fontSize="xs" color="fg.muted">
          {new Date(row.original.created_at).toLocaleDateString()}
        </Text>
      ),
    },
    {
      accessorKey: 'last_used_at',
      header: 'Last used',
      cell: ({ row }) => {
        const iso = row.original.last_used_at;
        if (!iso) {
          return (
            <Text
              fontSize="xs"
              color="fg.subtle"
              data-testid={`key-last-used-${row.original.id}`}
            >
              Never
            </Text>
          );
        }
        // Relative by default; absolute (UTC) revealed via the native title
        // tooltip on hover — same dependency-free pattern as the Nodes table.
        return (
          <Text
            fontSize="xs"
            color="fg.muted"
            title={formatAbsoluteTime(iso)}
            data-testid={`key-last-used-${row.original.id}`}
          >
            {formatRelativeTime(iso)}
          </Text>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      size: 120,
      cell: ({ row }) => (
        // The action zone is not part of the row's click target: clicks
        // (and Enter on a focused action) must never bubble up into the
        // row-level navigation DataTable attaches via `rowHref`.
        <HStack
          justify="flex-end"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.stopPropagation();
          }}
        >
          {!row.original.revoked && (
            <Button
              size="xs"
              variant="ghost"
              colorPalette="red"
              onClick={() => options.onRevoke(row.original)}
              data-testid={`key-revoke-${row.original.id}`}
            >
              Revoke
            </Button>
          )}
        </HStack>
      ),
    },
  ];
}
