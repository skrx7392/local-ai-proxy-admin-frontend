'use client';

import { Badge, Button, HStack, Link as ChakraLink, Text, VStack } from '@chakra-ui/react';
import type { ColumnDef } from '@tanstack/react-table';
import NextLink from 'next/link';

import type { User } from './schemas';

export function buildUserColumns(options: {
  onActivate: (user: User) => void;
  onDeactivate: (user: User) => void;
}): ColumnDef<User, unknown>[] {
  return [
    {
      accessorKey: 'email',
      header: 'User',
      cell: ({ row }) => (
        <VStack align="flex-start" gap="0">
          <ChakraLink asChild fontWeight="medium">
            <NextLink
              href={`/users/${row.original.id}`}
              data-testid={`user-email-${row.original.id}`}
            >
              {row.original.email}
            </NextLink>
          </ChakraLink>
          {row.original.name && (
            <Text fontSize="xs" color="fg.muted">
              {row.original.name}
            </Text>
          )}
        </VStack>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Badge
          colorPalette={row.original.role === 'admin' ? 'purple' : 'gray'}
          data-testid={`user-role-${row.original.id}`}
        >
          {row.original.role}
        </Badge>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          colorPalette={row.original.is_active ? 'green' : 'gray'}
          data-testid={`user-status-${row.original.id}`}
        >
          {row.original.is_active ? 'Active' : 'Deactivated'}
        </Badge>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Joined',
      cell: ({ row }) => (
        <Text fontSize="xs" color="fg.muted">
          {new Date(row.original.created_at).toLocaleDateString()}
        </Text>
      ),
    },
    {
      id: 'actions',
      header: '',
      size: 140,
      cell: ({ row }) => (
        <HStack justify="flex-end">
          {row.original.is_active ? (
            <Button
              size="xs"
              variant="ghost"
              colorPalette="red"
              onClick={() => options.onDeactivate(row.original)}
              data-testid={`user-deactivate-${row.original.id}`}
            >
              Deactivate
            </Button>
          ) : (
            <Button
              size="xs"
              variant="ghost"
              colorPalette="green"
              onClick={() => options.onActivate(row.original)}
              data-testid={`user-activate-${row.original.id}`}
            >
              Activate
            </Button>
          )}
        </HStack>
      ),
    },
  ];
}
