'use client';

import { Box, Button, Container, Heading, HStack, Stack, Text } from '@chakra-ui/react';
import { useMemo, useState } from 'react';

import { DataTable, FilterBar, Pagination } from '@/components/data';
import { ConfirmDialog } from '@/components/dialogs';
import { ApiError } from '@/lib/api/errors';

import { buildUserColumns } from '@/features/users/columns';
import {
  useActivateUser,
  useDeactivateUser,
  useUsersList,
} from '@/features/users/hooks';
import type { User } from '@/features/users/schemas';

type RoleFilter = 'all' | 'admin' | 'user';
type ActiveFilter = 'all' | 'active' | 'deactivated';

export default function UsersPage() {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);

  const [activateTarget, setActivateTarget] = useState<User | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      limit,
      offset,
      ...(roleFilter !== 'all' ? { role: roleFilter } : {}),
      ...(activeFilter === 'active' ? { is_active: true } : {}),
      ...(activeFilter === 'deactivated' ? { is_active: false } : {}),
    }),
    [limit, offset, roleFilter, activeFilter],
  );

  const listQuery = useUsersList(filters);
  const activate = useActivateUser();
  const deactivate = useDeactivateUser();

  const columns = useMemo(
    () =>
      buildUserColumns({
        onActivate: (user) => setActivateTarget(user),
        onDeactivate: (user) => {
          setDeactivateError(null);
          setDeactivateTarget(user);
        },
      }),
    [],
  );

  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.pagination?.total;

  function handleActivate(): void {
    if (!activateTarget) return;
    activate.mutate(activateTarget.id, {
      onSuccess: () => setActivateTarget(null),
    });
  }

  function handleDeactivate(): void {
    if (!deactivateTarget) return;
    setDeactivateError(null);
    deactivate.mutate(deactivateTarget.id, {
      onSuccess: () => setDeactivateTarget(null),
      onError: (error) => {
        if (error instanceof ApiError && error.code === 'last_admin') {
          setDeactivateError(
            'This is the last active admin. Promote another user to admin before deactivating this one.',
          );
          return;
        }
        setDeactivateError(
          error instanceof ApiError
            ? error.message
            : 'Failed to deactivate user.',
        );
      },
    });
  }

  function clearFilters(): void {
    setRoleFilter('all');
    setActiveFilter('all');
    setOffset(0);
  }

  const filtersActive = roleFilter !== 'all' || activeFilter !== 'all';

  return (
    <Container maxW="6xl" paddingBlock="8" paddingInline="6">
      <Stack gap="6">
        <Box>
          <Heading textStyle="heading.md">Users</Heading>
          <Text color="fg.muted" textStyle="body.sm">
            Activate or deactivate accounts. Role changes land in a later PR.
          </Text>
        </Box>

        <FilterBar hasActiveFilters={filtersActive} onClearFilters={clearFilters}>
          <HStack gap="2" data-testid="users-filter-role">
            {(['all', 'admin', 'user'] as const).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={roleFilter === value ? 'solid' : 'outline'}
                onClick={() => {
                  setRoleFilter(value);
                  setOffset(0);
                }}
                data-testid={`users-filter-role-${value}`}
              >
                {value === 'all' ? 'All roles' : value}
              </Button>
            ))}
          </HStack>
          <HStack gap="2" data-testid="users-filter-active">
            {(['all', 'active', 'deactivated'] as const).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={activeFilter === value ? 'solid' : 'outline'}
                onClick={() => {
                  setActiveFilter(value);
                  setOffset(0);
                }}
                data-testid={`users-filter-active-${value}`}
              >
                {value === 'all' ? 'Any status' : value}
              </Button>
            ))}
          </HStack>
        </FilterBar>

        <DataTable<User>
          data={rows}
          columns={columns}
          isLoading={listQuery.isLoading}
          getRowId={(row) => String(row.id)}
          aria-label="Users"
          emptyState={
            <Text color="fg.muted">
              {filtersActive
                ? 'No users match the current filters.'
                : 'No users yet.'}
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

      <ConfirmDialog
        isOpen={activateTarget !== null}
        onOpenChange={(open) => {
          if (!open) setActivateTarget(null);
        }}
        title="Activate this user?"
        description={
          activateTarget
            ? `${activateTarget.email} will regain access immediately.`
            : ''
        }
        confirmLabel="Activate"
        onConfirm={handleActivate}
        isConfirming={activate.isPending}
      />

      <ConfirmDialog
        isOpen={deactivateTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateTarget(null);
            setDeactivateError(null);
          }
        }}
        title="Deactivate this user?"
        description={
          deactivateTarget ? (
            <Stack gap="3">
              <Text textStyle="body.sm" color="fg.muted">
                {deactivateTarget.email} will immediately lose access. Existing
                API keys for this user stay revokable but won&apos;t accept new
                requests.
              </Text>
              {deactivateError && (
                <Text
                  role="alert"
                  color="red.500"
                  textStyle="body.sm"
                  data-testid="user-deactivate-error"
                >
                  {deactivateError}
                </Text>
              )}
            </Stack>
          ) : (
            ''
          )
        }
        confirmLabel="Deactivate"
        destructive
        onConfirm={handleDeactivate}
        isConfirming={deactivate.isPending}
      />
    </Container>
  );
}
