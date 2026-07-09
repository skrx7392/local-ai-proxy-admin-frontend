'use client';

import { Badge, Button, HStack, Text, VStack } from '@chakra-ui/react';
import type { ColumnDef } from '@tanstack/react-table';

import type { Account } from './schemas';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

// "Available" and "Balance" look identical whenever nothing is reserved
// (available = balance − reserved), so each header carries a tooltip that
// defines it. Dotted underline signals the hover affordance.
function HeaderHint({ label, hint }: { label: string; hint: string }) {
  return (
    <Text
      as="span"
      title={hint}
      cursor="help"
      textDecoration="underline dotted"
      textUnderlineOffset="2px"
      data-testid={`account-col-${label.toLowerCase()}`}
    >
      {label}
    </Text>
  );
}

export function buildAccountColumns(options: {
  onGrantCredits: (account: Account) => void;
  onCreateKey: (account: Account) => void;
}): ColumnDef<Account, unknown>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Account',
      cell: ({ row }) => (
        <VStack align="flex-start" gap="0">
          <Text fontWeight="medium" data-testid={`account-name-${row.original.id}`}>
            {row.original.name}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            #{row.original.id}
          </Text>
        </VStack>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge colorPalette={row.original.type === 'service' ? 'blue' : 'gray'}>
          {row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge colorPalette={row.original.is_active ? 'green' : 'gray'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessorKey: 'available',
      header: () => (
        <HeaderHint
          label="Available"
          hint="Spendable now — balance minus credits reserved for in-flight requests."
        />
      ),
      cell: ({ row }) => (
        <VStack align="flex-start" gap="0">
          <Text
            fontWeight="semibold"
            data-testid={`account-available-${row.original.id}`}
          >
            {money.format(row.original.available)}
          </Text>
          {row.original.reserved > 0 && (
            <Text fontSize="xs" color="fg.muted">
              {money.format(row.original.reserved)} reserved
            </Text>
          )}
        </VStack>
      ),
    },
    {
      accessorKey: 'balance',
      header: () => (
        <HeaderHint
          label="Balance"
          hint="Total credits on the account, including any reserved for in-flight requests."
        />
      ),
      cell: ({ row }) => <Text>{money.format(row.original.balance)}</Text>,
    },
    {
      id: 'actions',
      header: '',
      size: 240,
      cell: ({ row }) => (
        <HStack justify="flex-end" gap="1">
          <Button
            size="xs"
            variant="ghost"
            onClick={() => options.onGrantCredits(row.original)}
            data-testid={`account-grant-${row.original.id}`}
          >
            Grant credits
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => options.onCreateKey(row.original)}
            data-testid={`account-newkey-${row.original.id}`}
          >
            New key
          </Button>
        </HStack>
      ),
    },
  ];
}
