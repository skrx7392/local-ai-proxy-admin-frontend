'use client';

import { Badge, Button, HStack, Text } from '@chakra-ui/react';
import type { ColumnDef } from '@tanstack/react-table';

import type { Key } from './schemas';

export function buildKeyColumns(options: {
  onRevoke: (key: Key) => void;
}): ColumnDef<Key, unknown>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <Text fontWeight="medium" data-testid={`key-name-${row.original.id}`}>
          {row.original.name}
        </Text>
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
      id: 'actions',
      header: '',
      size: 120,
      cell: ({ row }) => (
        <HStack justify="flex-end">
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
