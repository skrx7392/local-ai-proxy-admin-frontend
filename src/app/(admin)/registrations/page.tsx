'use client';

import { Box, Container, Heading, Stack, Text } from '@chakra-ui/react';
import { useMemo } from 'react';

import { DataTable, EmptyState, Pagination } from '@/components/data';
import { readInt, useListSearchParams } from '@/lib/url/listState';

import { buildRegistrationColumns } from '@/features/registrations/columns';
import { useRegistrationsList } from '@/features/registrations/hooks';
import type { RegistrationEvent } from '@/features/registrations/schemas';

export default function RegistrationsPage() {
  const { searchParams, update } = useListSearchParams();
  const limit = readInt(searchParams, 'limit', 25);
  const offset = readInt(searchParams, 'offset', 0);

  const listQuery = useRegistrationsList({ limit, offset });
  const columns = useMemo(() => buildRegistrationColumns(), []);

  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.pagination.total ?? 0;

  return (
    <Container maxW="6xl" paddingBlock="8" paddingInline="6">
      <Stack gap="6">
        <Box>
          <Heading textStyle="heading.md">Registrations</Heading>
          <Text color="fg.muted" textStyle="body.sm">
            Audit feed of user signups, account creations, registration-token
            redemptions, and admin bootstraps.
          </Text>
        </Box>

        <DataTable<RegistrationEvent>
          data={rows}
          columns={columns}
          isLoading={listQuery.isLoading}
          getRowId={(row) => String(row.id)}
          aria-label="Registration events"
          emptyState={<EmptyState title="No registration events recorded yet" />}
        />

        <Pagination
          limit={limit}
          offset={offset}
          total={total}
          pageRowCount={rows.length}
          onChange={({ limit: l, offset: o }) =>
            update({ limit: l, offset: o || null })
          }
          isLoading={listQuery.isFetching}
        />
      </Stack>
    </Container>
  );
}
