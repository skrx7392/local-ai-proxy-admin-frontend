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

const TYPE_BADGE: Record<string, string> = {
  service: 'blue',
  end_user: 'purple',
};

export function buildAccountColumns(options: {
  onGrantCredits: (account: Account) => void;
  onCreateKey: (account: Account) => void;
  onEditAllowance: (account: Account) => void;
  onEditRateLimit: (account: Account) => void;
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
            {row.original.email && row.original.email !== row.original.name
              ? ` · ${row.original.email}`
              : ''}
          </Text>
        </VStack>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge colorPalette={TYPE_BADGE[row.original.type] ?? 'gray'}>
          {row.original.type === 'end_user' ? 'end user' : row.original.type}
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
      id: 'allowance',
      header: () => (
        <HeaderHint
          label="Allowance"
          hint="Monthly grant for end-user accounts — the balance resets to this at the start of every month."
        />
      ),
      cell: ({ row }) =>
        row.original.allowance_managed &&
        row.original.effective_monthly_grant !== null ? (
          <VStack align="flex-start" gap="0">
            <Text data-testid={`account-allowance-${row.original.id}`}>
              {money.format(row.original.effective_monthly_grant)}/mo
            </Text>
            {row.original.monthly_grant === null && (
              <Text fontSize="xs" color="fg.muted">
                default
              </Text>
            )}
          </VStack>
        ) : (
          <Text color="fg.muted">—</Text>
        ),
    },
    {
      id: 'rate_limit',
      header: () => (
        <HeaderHint
          label="Rate limit"
          hint="Requests per minute for this account — the class default unless overridden."
        />
      ),
      cell: ({ row }) => (
        <VStack align="flex-start" gap="0">
          <Text data-testid={`account-ratelimit-${row.original.id}`}>
            {row.original.effective_rate_limit_per_min}/min
          </Text>
          {row.original.rate_limit_per_min === null && (
            <Text fontSize="xs" color="fg.muted">
              default
            </Text>
          )}
        </VStack>
      ),
    },
    {
      id: 'actions',
      header: '',
      size: 340,
      cell: ({ row }) => (
        <HStack justify="flex-end" gap="1">
          {row.original.allowance_managed && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => options.onEditAllowance(row.original)}
              data-testid={`account-allowance-edit-${row.original.id}`}
            >
              Allowance
            </Button>
          )}
          <Button
            size="xs"
            variant="ghost"
            onClick={() => options.onEditRateLimit(row.original)}
            data-testid={`account-ratelimit-edit-${row.original.id}`}
          >
            Rate limit
          </Button>
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
