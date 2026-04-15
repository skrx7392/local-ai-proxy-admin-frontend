'use client';

import { Box, Button, Container, Heading, HStack, Stack, Text } from '@chakra-ui/react';
import { useMemo, useState } from 'react';

import { DataTable, FilterBar, Pagination } from '@/components/data';
import { OneTimeSecretDialog } from '@/components/dialogs';
import { ApiError } from '@/lib/api/errors';

import { CreateAccountKeyDialog } from '@/features/accounts/CreateAccountKeyDialog';
import { GrantCreditsDialog } from '@/features/accounts/GrantCreditsDialog';
import { buildAccountColumns } from '@/features/accounts/columns';
import {
  useAccountsList,
  useCreateAccountKey,
  useGrantCredits,
} from '@/features/accounts/hooks';
import type {
  Account,
  AccountKeyFormValues,
  GrantCreditsFormValues,
} from '@/features/accounts/schemas';

type TypeFilter = 'all' | 'personal' | 'service';
type ActiveFilter = 'all' | 'active' | 'inactive';

export default function AccountsPage() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);

  const [grantTarget, setGrantTarget] = useState<Account | null>(null);
  const [grantError, setGrantError] = useState<string | undefined>(undefined);

  const [keyTarget, setKeyTarget] = useState<Account | null>(null);
  const [keyError, setKeyError] = useState<string | undefined>(undefined);
  const [createdKeySecret, setCreatedKeySecret] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      limit,
      offset,
      ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
      ...(activeFilter === 'active' ? { is_active: true } : {}),
      ...(activeFilter === 'inactive' ? { is_active: false } : {}),
    }),
    [limit, offset, typeFilter, activeFilter],
  );

  const listQuery = useAccountsList(filters);

  // Scoped to the currently-targeted account so the mutation knows which
  // id to hit. The grant + create-key modals are mutually exclusive per
  // row, so the narrower scope is fine.
  const grant = useGrantCredits(grantTarget?.id ?? null);
  const createKey = useCreateAccountKey(keyTarget?.id ?? null);

  const columns = useMemo(
    () =>
      buildAccountColumns({
        onGrantCredits: (account) => {
          setGrantError(undefined);
          setGrantTarget(account);
        },
        onCreateKey: (account) => {
          setKeyError(undefined);
          setKeyTarget(account);
        },
      }),
    [],
  );

  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.pagination?.total;

  function handleGrant(values: GrantCreditsFormValues): void {
    setGrantError(undefined);
    grant.mutate(values, {
      onSuccess: () => setGrantTarget(null),
      onError: (error) => {
        setGrantError(
          error instanceof ApiError ? error.message : 'Failed to grant credits.',
        );
      },
    });
  }

  function handleCreateKey(values: AccountKeyFormValues): void {
    setKeyError(undefined);
    createKey.mutate(values, {
      onSuccess: (result) => {
        setKeyTarget(null);
        setCreatedKeySecret(result.key);
      },
      onError: (error) => {
        setKeyError(
          error instanceof ApiError ? error.message : 'Failed to create key.',
        );
      },
    });
  }

  function clearFilters(): void {
    setTypeFilter('all');
    setActiveFilter('all');
    setOffset(0);
  }

  const filtersActive = typeFilter !== 'all' || activeFilter !== 'all';

  return (
    <Container maxW="6xl" paddingBlock="8" paddingInline="6">
      <Stack gap="6">
        <Box>
          <Heading textStyle="heading.md">Accounts</Heading>
          <Text color="fg.muted" textStyle="body.sm">
            Credit balances and account-scoped keys.
          </Text>
        </Box>

        <FilterBar hasActiveFilters={filtersActive} onClearFilters={clearFilters}>
          <HStack gap="2" data-testid="accounts-filter-type">
            {(['all', 'personal', 'service'] as const).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={typeFilter === value ? 'solid' : 'outline'}
                onClick={() => {
                  setTypeFilter(value);
                  setOffset(0);
                }}
                data-testid={`accounts-filter-type-${value}`}
              >
                {value === 'all' ? 'All types' : value}
              </Button>
            ))}
          </HStack>
          <HStack gap="2" data-testid="accounts-filter-active">
            {(['all', 'active', 'inactive'] as const).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={activeFilter === value ? 'solid' : 'outline'}
                onClick={() => {
                  setActiveFilter(value);
                  setOffset(0);
                }}
                data-testid={`accounts-filter-active-${value}`}
              >
                {value === 'all' ? 'Any status' : value}
              </Button>
            ))}
          </HStack>
        </FilterBar>

        <DataTable<Account>
          data={rows}
          columns={columns}
          isLoading={listQuery.isLoading}
          getRowId={(row) => String(row.id)}
          aria-label="Accounts"
          emptyState={
            <Text color="fg.muted">
              {filtersActive
                ? 'No accounts match the current filters.'
                : 'No accounts yet.'}
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

      <GrantCreditsDialog
        isOpen={grantTarget !== null}
        accountName={grantTarget?.name ?? null}
        onOpenChange={(open) => {
          if (!open) {
            setGrantTarget(null);
            setGrantError(undefined);
          }
        }}
        onSubmit={handleGrant}
        isSubmitting={grant.isPending}
        submissionError={grantError}
      />

      <CreateAccountKeyDialog
        isOpen={keyTarget !== null}
        accountName={keyTarget?.name ?? null}
        onOpenChange={(open) => {
          if (!open) {
            setKeyTarget(null);
            setKeyError(undefined);
          }
        }}
        onSubmit={handleCreateKey}
        isSubmitting={createKey.isPending}
        submissionError={keyError}
      />

      <OneTimeSecretDialog
        isOpen={createdKeySecret !== null}
        secret={createdKeySecret}
        title="API key created"
        description="Copy this key now. You won't be able to see it again."
        onClose={() => setCreatedKeySecret(null)}
      />
    </Container>
  );
}
