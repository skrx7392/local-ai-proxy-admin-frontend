'use client';

import { Box, Button, Container, Heading, HStack, Stack, Text } from '@chakra-ui/react';
import { useMemo, useState } from 'react';

import { DataTable, EmptyState, FilterBar, Pagination } from '@/components/data';
import { OneTimeSecretDialog } from '@/components/dialogs';
import { ApiError } from '@/lib/api/errors';
import { readEnum, readInt, useListSearchParams } from '@/lib/url/listState';

import { AllowanceDialog } from '@/features/accounts/AllowanceDialog';
import { RateLimitDialog } from '@/features/accounts/RateLimitDialog';
import { CreateAccountKeyDialog } from '@/features/accounts/CreateAccountKeyDialog';
import { CreditRequestsStrip } from '@/features/accounts/CreditRequestsStrip';
import { GrantCreditsDialog } from '@/features/accounts/GrantCreditsDialog';
import { buildAccountColumns } from '@/features/accounts/columns';
import {
  useAccountsList,
  useCreateAccountKey,
  useGrantCredits,
  useSetAllowance,
  useSetRateLimit,
} from '@/features/accounts/hooks';
import type {
  Account,
  AccountKeyFormValues,
  AllowanceFormValues,
  GrantCreditsFormValues,
  RateLimitFormValues,
} from '@/features/accounts/schemas';

const TYPE_VALUES = ['all', 'personal', 'service', 'end_user'] as const;
const ACTIVE_VALUES = ['all', 'active', 'inactive'] as const;
type TypeFilter = (typeof TYPE_VALUES)[number];
type ActiveFilter = (typeof ACTIVE_VALUES)[number];

// Neutral option is "All <dimension>"; values are Title Case (app-wide
// filter-chip convention).
const TYPE_LABELS: Record<TypeFilter, string> = {
  all: 'All types',
  personal: 'Personal',
  service: 'Service',
  end_user: 'End user',
};
const ACTIVE_LABELS: Record<ActiveFilter, string> = {
  all: 'All statuses',
  active: 'Active',
  inactive: 'Inactive',
};

export default function AccountsPage() {
  const { searchParams, update } = useListSearchParams();

  const typeFilter = readEnum(searchParams, 'type', TYPE_VALUES, 'all');
  const activeFilter = readEnum(searchParams, 'active', ACTIVE_VALUES, 'all');
  const limit = readInt(searchParams, 'limit', 25);
  const offset = readInt(searchParams, 'offset', 0);

  const [grantTarget, setGrantTarget] = useState<Account | null>(null);
  const [grantError, setGrantError] = useState<string | undefined>(undefined);

  const [keyTarget, setKeyTarget] = useState<Account | null>(null);
  const [keyError, setKeyError] = useState<string | undefined>(undefined);
  const [createdKeySecret, setCreatedKeySecret] = useState<string | null>(null);

  const [allowanceTarget, setAllowanceTarget] = useState<Account | null>(null);
  const [allowanceError, setAllowanceError] = useState<string | undefined>(
    undefined,
  );

  const [rateLimitTarget, setRateLimitTarget] = useState<Account | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | undefined>(
    undefined,
  );

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
  const grant = useGrantCredits(grantTarget?.id ?? null);
  const createKey = useCreateAccountKey(keyTarget?.id ?? null);
  const setAllowance = useSetAllowance(allowanceTarget?.id ?? null);
  const setRateLimit = useSetRateLimit(rateLimitTarget?.id ?? null);

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
        onEditAllowance: (account) => {
          setAllowanceError(undefined);
          setAllowanceTarget(account);
        },
        onEditRateLimit: (account) => {
          setRateLimitError(undefined);
          setRateLimitTarget(account);
        },
      }),
    [],
  );

  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.pagination.total ?? 0;

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

  function applyAllowance(monthlyGrant: number | null): void {
    setAllowanceError(undefined);
    setAllowance.mutate(monthlyGrant, {
      onSuccess: () => setAllowanceTarget(null),
      onError: (error) => {
        setAllowanceError(
          error instanceof ApiError
            ? error.message
            : 'Failed to update allowance.',
        );
      },
    });
  }

  function handleAllowanceSubmit(values: AllowanceFormValues): void {
    applyAllowance(values.monthly_grant);
  }

  function applyRateLimit(rateLimitPerMin: number | null): void {
    setRateLimitError(undefined);
    setRateLimit.mutate(rateLimitPerMin, {
      onSuccess: () => setRateLimitTarget(null),
      onError: (error) => {
        setRateLimitError(
          error instanceof ApiError
            ? error.message
            : 'Failed to update rate limit.',
        );
      },
    });
  }

  function handleRateLimitSubmit(values: RateLimitFormValues): void {
    applyRateLimit(values.rate_limit_per_min);
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

  function setType(next: TypeFilter): void {
    update({ type: next === 'all' ? null : next }, { resetOffset: true });
  }

  function setActive(next: ActiveFilter): void {
    update({ active: next === 'all' ? null : next }, { resetOffset: true });
  }

  function clearFilters(): void {
    update({ type: null, active: null, offset: null });
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

        <CreditRequestsStrip />

        <FilterBar hasActiveFilters={filtersActive} onClearFilters={clearFilters}>
          <HStack gap="2" data-testid="accounts-filter-type">
            {TYPE_VALUES.map((value) => (
              <Button
                key={value}
                size="sm"
                variant={typeFilter === value ? 'solid' : 'outline'}
                onClick={() => setType(value)}
                data-testid={`accounts-filter-type-${value}`}
              >
                {TYPE_LABELS[value]}
              </Button>
            ))}
          </HStack>
          <HStack gap="2" data-testid="accounts-filter-active">
            {ACTIVE_VALUES.map((value) => (
              <Button
                key={value}
                size="sm"
                variant={activeFilter === value ? 'solid' : 'outline'}
                onClick={() => setActive(value)}
                data-testid={`accounts-filter-active-${value}`}
              >
                {ACTIVE_LABELS[value]}
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
            filtersActive ? (
              <EmptyState
                title="No accounts match"
                description="Try a different filter."
              />
            ) : (
              <EmptyState title="No accounts yet" />
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

      <AllowanceDialog
        isOpen={allowanceTarget !== null}
        account={allowanceTarget}
        onOpenChange={(open) => {
          if (!open) {
            setAllowanceTarget(null);
            setAllowanceError(undefined);
          }
        }}
        onSubmit={handleAllowanceSubmit}
        onUseDefault={() => applyAllowance(null)}
        isSubmitting={setAllowance.isPending}
        submissionError={allowanceError}
      />

      <RateLimitDialog
        isOpen={rateLimitTarget !== null}
        account={rateLimitTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRateLimitTarget(null);
            setRateLimitError(undefined);
          }
        }}
        onSubmit={handleRateLimitSubmit}
        onUseDefault={() => applyRateLimit(null)}
        isSubmitting={setRateLimit.isPending}
        submissionError={rateLimitError}
      />
    </Container>
  );
}
