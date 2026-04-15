'use client';

import { Box, Button, Container, Heading, HStack, Stack, Text } from '@chakra-ui/react';
import { useMemo, useState } from 'react';

import { DataTable, EmptyState, FilterBar, Pagination } from '@/components/data';
import { ConfirmDialog, OneTimeSecretDialog } from '@/components/dialogs';
import { ApiError } from '@/lib/api/errors';
import { readEnum, readInt, useListSearchParams } from '@/lib/url/listState';

import { CreateKeyDialog } from '@/features/keys/CreateKeyDialog';
import { buildKeyColumns } from '@/features/keys/columns';
import { useCreateKey, useKeysList, useRevokeKey } from '@/features/keys/hooks';
import type { CreateKeyFormValues, Key } from '@/features/keys/schemas';

const ACTIVE_VALUES = ['all', 'active', 'revoked'] as const;
type ActiveFilter = (typeof ACTIVE_VALUES)[number];

export default function KeysPage() {
  const { searchParams, update } = useListSearchParams();

  const activeFilter = readEnum(searchParams, 'active', ACTIVE_VALUES, 'all');
  const limit = readInt(searchParams, 'limit', 25);
  const offset = readInt(searchParams, 'offset', 0);

  const [createOpen, setCreateOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | undefined>(undefined);

  const [keyToRevoke, setKeyToRevoke] = useState<Key | null>(null);

  const filters = useMemo(
    () => ({
      limit,
      offset,
      ...(activeFilter === 'active' ? { is_active: true } : {}),
      ...(activeFilter === 'revoked' ? { is_active: false } : {}),
    }),
    [limit, offset, activeFilter],
  );

  const listQuery = useKeysList(filters);
  const createKey = useCreateKey();
  const revokeKey = useRevokeKey();

  const columns = useMemo(
    () =>
      buildKeyColumns({
        onRevoke: (key) => setKeyToRevoke(key),
      }),
    [],
  );

  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.pagination.total ?? 0;

  function handleCreate(values: CreateKeyFormValues): void {
    setCreateError(undefined);
    createKey.mutate(values, {
      onSuccess: (result) => {
        setCreateOpen(false);
        setCreatedSecret(result.key);
      },
      onError: (error) => {
        setCreateError(
          error instanceof ApiError ? error.message : 'Failed to create key.',
        );
      },
    });
  }

  function handleRevoke(): void {
    if (!keyToRevoke) return;
    revokeKey.mutate(keyToRevoke.id, {
      onSuccess: () => setKeyToRevoke(null),
    });
  }

  function setActiveFilter(next: ActiveFilter): void {
    update({ active: next === 'all' ? null : next }, { resetOffset: true });
  }

  return (
    <Container maxW="6xl" paddingBlock="8" paddingInline="6">
      <Stack gap="6">
        <HStack justify="space-between" align="flex-start">
          <Box>
            <Heading textStyle="heading.md">API keys</Heading>
            <Text color="fg.muted" textStyle="body.sm">
              Create and revoke Bearer tokens used to call the proxy.
            </Text>
          </Box>
          <Button
            colorPalette="accent"
            onClick={() => {
              setCreateError(undefined);
              setCreateOpen(true);
            }}
            data-testid="keys-create-button"
          >
            New key
          </Button>
        </HStack>

        <FilterBar
          hasActiveFilters={activeFilter !== 'all'}
          onClearFilters={() => setActiveFilter('all')}
        >
          <HStack gap="2" data-testid="keys-filter-active">
            {ACTIVE_VALUES.map((value) => (
              <Button
                key={value}
                size="sm"
                variant={activeFilter === value ? 'solid' : 'outline'}
                onClick={() => setActiveFilter(value)}
                data-testid={`keys-filter-active-${value}`}
              >
                {value === 'all' ? 'All' : value === 'active' ? 'Active' : 'Revoked'}
              </Button>
            ))}
          </HStack>
        </FilterBar>

        <DataTable<Key>
          data={rows}
          columns={columns}
          isLoading={listQuery.isLoading}
          getRowId={(row) => String(row.id)}
          aria-label="API keys"
          emptyState={
            activeFilter === 'all' ? (
              <EmptyState
                title="No keys yet"
                description="Click “New key” to create one."
              />
            ) : (
              <EmptyState
                title={`No ${activeFilter} keys`}
                description="Try a different filter."
              />
            )
          }
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

      <CreateKeyDialog
        isOpen={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setCreateError(undefined);
        }}
        onSubmit={handleCreate}
        isSubmitting={createKey.isPending}
        submissionError={createError}
      />

      <ConfirmDialog
        isOpen={keyToRevoke !== null}
        onOpenChange={(open) => {
          if (!open) setKeyToRevoke(null);
        }}
        title="Revoke this key?"
        description={
          keyToRevoke
            ? `"${keyToRevoke.name}" will stop accepting requests immediately. This cannot be undone.`
            : ''
        }
        confirmLabel="Revoke"
        destructive
        onConfirm={handleRevoke}
        isConfirming={revokeKey.isPending}
      />

      <OneTimeSecretDialog
        isOpen={createdSecret !== null}
        secret={createdSecret}
        title="API key created"
        description="Copy this key now. You won't be able to see it again."
        onClose={() => setCreatedSecret(null)}
      />
    </Container>
  );
}
