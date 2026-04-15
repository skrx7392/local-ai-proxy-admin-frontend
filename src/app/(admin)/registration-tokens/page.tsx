'use client';

import { Box, Button, Container, Heading, HStack, Stack, Text } from '@chakra-ui/react';
import { useMemo, useState } from 'react';

import { DataTable, FilterBar, Pagination } from '@/components/data';
import { ConfirmDialog, OneTimeSecretDialog } from '@/components/dialogs';
import { ApiError } from '@/lib/api/errors';

import { CreateRegistrationTokenDialog } from '@/features/registrationTokens/CreateRegistrationTokenDialog';
import { buildRegistrationTokenColumns } from '@/features/registrationTokens/columns';
import {
  useCreateRegistrationToken,
  useRegistrationTokensList,
  useRevokeRegistrationToken,
} from '@/features/registrationTokens/hooks';
import type {
  RegistrationToken,
  RegistrationTokenFormValues,
} from '@/features/registrationTokens/schemas';

type ActiveFilter = 'all' | 'active' | 'revoked';

export default function RegistrationTokensPage() {
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | undefined>(undefined);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const [revokeTarget, setRevokeTarget] = useState<RegistrationToken | null>(
    null,
  );

  const filters = useMemo(
    () => ({
      limit,
      offset,
      ...(activeFilter === 'active' ? { is_active: true } : {}),
      ...(activeFilter === 'revoked' ? { is_active: false } : {}),
    }),
    [limit, offset, activeFilter],
  );

  const listQuery = useRegistrationTokensList(filters);
  const create = useCreateRegistrationToken();
  const revoke = useRevokeRegistrationToken();

  const columns = useMemo(
    () =>
      buildRegistrationTokenColumns({
        onRevoke: (token) => setRevokeTarget(token),
      }),
    [],
  );

  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.pagination?.total;

  function handleCreate(values: RegistrationTokenFormValues): void {
    setCreateError(undefined);
    create.mutate(values, {
      onSuccess: (result) => {
        setCreateOpen(false);
        setCreatedSecret(result.token);
      },
      onError: (error) => {
        setCreateError(
          error instanceof ApiError ? error.message : 'Failed to create token.',
        );
      },
    });
  }

  function handleRevoke(): void {
    if (!revokeTarget) return;
    revoke.mutate(revokeTarget.id, {
      onSuccess: () => setRevokeTarget(null),
    });
  }

  function setFilterAndReset(next: ActiveFilter): void {
    setActiveFilter(next);
    setOffset(0);
  }

  return (
    <Container maxW="6xl" paddingBlock="8" paddingInline="6">
      <Stack gap="6">
        <HStack justify="space-between" align="flex-start">
          <Box>
            <Heading textStyle="heading.md">Registration tokens</Heading>
            <Text color="fg.muted" textStyle="body.sm">
              Share a link that creates a new user account with a starting
              credit balance. Plaintext is shown once at creation.
            </Text>
          </Box>
          <Button
            colorPalette="accent"
            onClick={() => {
              setCreateError(undefined);
              setCreateOpen(true);
            }}
            data-testid="regtokens-create-button"
          >
            New token
          </Button>
        </HStack>

        <FilterBar
          hasActiveFilters={activeFilter !== 'all'}
          onClearFilters={() => setFilterAndReset('all')}
        >
          <HStack gap="2" data-testid="regtokens-filter-active">
            {(['all', 'active', 'revoked'] as const).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={activeFilter === value ? 'solid' : 'outline'}
                onClick={() => setFilterAndReset(value)}
                data-testid={`regtokens-filter-active-${value}`}
              >
                {value === 'all' ? 'All' : value === 'active' ? 'Active' : 'Revoked'}
              </Button>
            ))}
          </HStack>
        </FilterBar>

        <DataTable<RegistrationToken>
          data={rows}
          columns={columns}
          isLoading={listQuery.isLoading}
          getRowId={(row) => String(row.id)}
          aria-label="Registration tokens"
          emptyState={
            <Text color="fg.muted">
              {activeFilter === 'all'
                ? 'No registration tokens yet — click “New token” to create one.'
                : `No ${activeFilter} tokens.`}
            </Text>
          }
        />

        <Pagination
          limit={limit}
          offset={offset}
          total={total}
          pageRowCount={rows.length}
          onChange={({ limit: l, offset: o }) => {
            setLimit(l);
            setOffset(o);
          }}
          isLoading={listQuery.isFetching}
        />
      </Stack>

      <CreateRegistrationTokenDialog
        isOpen={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setCreateError(undefined);
        }}
        onSubmit={handleCreate}
        isSubmitting={create.isPending}
        submissionError={createError}
      />

      <ConfirmDialog
        isOpen={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        title="Revoke this token?"
        description={
          revokeTarget
            ? `"${revokeTarget.name}" will stop accepting new registrations immediately. Existing accounts created from this token are unaffected.`
            : ''
        }
        confirmLabel="Revoke"
        destructive
        onConfirm={handleRevoke}
        isConfirming={revoke.isPending}
      />

      <OneTimeSecretDialog
        isOpen={createdSecret !== null}
        secret={createdSecret}
        title="Registration token created"
        description="Copy this token now. You won't be able to see it again."
        onClose={() => setCreatedSecret(null)}
      />
    </Container>
  );
}
