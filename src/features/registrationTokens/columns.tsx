'use client';

import { Badge, Button, HStack, Progress, Text, VStack } from '@chakra-ui/react';
import type { ColumnDef } from '@tanstack/react-table';

import type { RegistrationToken } from './schemas';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export function buildRegistrationTokenColumns(options: {
  onRevoke: (token: RegistrationToken) => void;
}): ColumnDef<RegistrationToken, unknown>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <Text fontWeight="medium" data-testid={`regtoken-name-${row.original.id}`}>
          {row.original.name}
        </Text>
      ),
    },
    {
      accessorKey: 'credit_grant',
      header: 'Grant',
      cell: ({ row }) => (
        <Text>{money.format(row.original.credit_grant)}</Text>
      ),
    },
    {
      accessorKey: 'uses',
      header: 'Uses',
      cell: ({ row }) => {
        const pct =
          row.original.max_uses === 0
            ? 0
            : Math.min(
                100,
                Math.round((row.original.uses / row.original.max_uses) * 100),
              );
        return (
          <VStack align="flex-start" gap="1" minW="32">
            <Text fontSize="xs">
              {row.original.uses} / {row.original.max_uses}
            </Text>
            <Progress.Root value={pct} size="xs" width="full">
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
          </VStack>
        );
      },
    },
    {
      accessorKey: 'expires_at',
      header: 'Expires',
      cell: ({ row }) =>
        row.original.expires_at ? (
          <Text fontSize="xs" color="fg.muted">
            {new Date(row.original.expires_at).toLocaleDateString()}
          </Text>
        ) : (
          <Text fontSize="xs" color="fg.subtle">
            never
          </Text>
        ),
    },
    {
      accessorKey: 'revoked',
      header: 'Status',
      cell: ({ row }) => {
        const active = !row.original.revoked;
        const exhausted =
          active &&
          row.original.max_uses > 0 &&
          row.original.uses >= row.original.max_uses;
        return (
          <Badge
            colorPalette={exhausted ? 'orange' : active ? 'green' : 'gray'}
            data-testid={`regtoken-status-${row.original.id}`}
          >
            {row.original.revoked ? 'Revoked' : exhausted ? 'Used up' : 'Active'}
          </Badge>
        );
      },
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
              data-testid={`regtoken-revoke-${row.original.id}`}
            >
              Revoke
            </Button>
          )}
        </HStack>
      ),
    },
  ];
}
