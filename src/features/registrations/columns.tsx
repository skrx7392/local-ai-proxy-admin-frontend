'use client';

import { Badge, Stack, Text } from '@chakra-ui/react';
import type { ColumnDef } from '@tanstack/react-table';

import { formatAbsoluteTime, formatRelativeTime } from '@/lib/utils/datetime';

import type { RegistrationEvent } from './schemas';

// Kind-specific badge palettes so admin-created accounts, user self-signups,
// and registration-token redemptions are visually distinct at a glance.
function kindPalette(kind: string): string {
  switch (kind) {
    case 'user_signup':
      return 'green';
    case 'account_create':
      return 'purple';
    case 'registration_token_redeem':
      return 'blue';
    case 'admin_bootstrap':
      return 'orange';
    default:
      return 'gray';
  }
}

export function buildRegistrationColumns(): ColumnDef<
  RegistrationEvent,
  unknown
>[] {
  return [
    {
      accessorKey: 'created_at',
      header: 'When',
      size: 180,
      // Relative by default, absolute (UTC) on hover — unambiguous and
      // consistent with the Keys/Users tables.
      cell: ({ row }) => {
        const iso = row.original.created_at;
        return (
          <Text
            fontSize="xs"
            color="fg.muted"
            title={formatAbsoluteTime(iso)}
            data-testid={`registration-when-${row.original.id}`}
          >
            {formatRelativeTime(iso)}
          </Text>
        );
      },
    },
    {
      accessorKey: 'kind',
      header: 'Kind',
      cell: ({ row }) => (
        <Badge
          colorPalette={kindPalette(row.original.kind)}
          data-testid={`registration-kind-${row.original.id}`}
        >
          {row.original.kind}
        </Badge>
      ),
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ row }) => (
        <Text fontSize="xs" color="fg.muted">
          {row.original.source}
        </Text>
      ),
    },
    {
      id: 'who',
      header: 'User / account',
      cell: ({ row }) => {
        const { user_email, user_name, account_name, account_type } =
          row.original;
        return (
          <Stack gap="0.5">
            {user_email && (
              <Text fontSize="sm" data-testid={`registration-user-${row.original.id}`}>
                {user_name ? `${user_name} (${user_email})` : user_email}
              </Text>
            )}
            {account_name && (
              <Text fontSize="xs" color="fg.muted">
                {account_name}
                {account_type ? ` · ${account_type}` : ''}
              </Text>
            )}
            {!user_email && !account_name && (
              <Text fontSize="xs" color="fg.subtle">
                —
              </Text>
            )}
          </Stack>
        );
      },
    },
    {
      id: 'via',
      header: 'Registration token',
      size: 140,
      cell: ({ row }) =>
        row.original.registration_token_id !== null ? (
          <Text fontSize="xs" color="fg.muted">
            #{row.original.registration_token_id}
          </Text>
        ) : (
          <Text fontSize="xs" color="fg.subtle">
            —
          </Text>
        ),
    },
  ];
}
