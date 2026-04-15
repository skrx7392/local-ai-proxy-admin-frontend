'use client';

import { Box, Button, Container, Heading, HStack, Stack, Text } from '@chakra-ui/react';
import { useMemo, useState } from 'react';

import { DataTable, Pagination } from '@/components/data';
import { ConfirmDialog } from '@/components/dialogs';
import { ApiError } from '@/lib/api/errors';

import { PricingFormDialog } from '@/features/pricing/PricingFormDialog';
import { buildPricingColumns } from '@/features/pricing/columns';
import {
  useDeletePricing,
  usePricingList,
  useUpsertPricing,
} from '@/features/pricing/hooks';
import type { Pricing, PricingFormValues } from '@/features/pricing/schemas';

export default function PricingPage() {
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [formEditing, setFormEditing] = useState<Pricing | null>(null);
  const [formError, setFormError] = useState<string | undefined>(undefined);

  const [deleteTarget, setDeleteTarget] = useState<Pricing | null>(null);

  const listQuery = usePricingList({ limit, offset });
  const upsert = useUpsertPricing();
  const remove = useDeletePricing();

  const columns = useMemo(
    () =>
      buildPricingColumns({
        onEdit: (pricing) => {
          setFormError(undefined);
          setFormEditing(pricing);
          setFormOpen(true);
        },
        onDelete: (pricing) => setDeleteTarget(pricing),
      }),
    [],
  );

  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.pagination?.total;

  function handleSubmit(values: PricingFormValues): void {
    setFormError(undefined);
    upsert.mutate(values, {
      onSuccess: () => {
        setFormOpen(false);
        setFormEditing(null);
      },
      onError: (error) => {
        setFormError(
          error instanceof ApiError ? error.message : 'Failed to save pricing.',
        );
      },
    });
  }

  function handleDelete(): void {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  return (
    <Container maxW="6xl" paddingBlock="8" paddingInline="6">
      <Stack gap="6">
        <HStack justify="space-between" align="flex-start">
          <Box>
            <Heading textStyle="heading.md">Pricing</Heading>
            <Text color="fg.muted" textStyle="body.sm">
              Per-model prompt and completion rates. Only active rows are
              listed; archiving soft-deletes.
            </Text>
          </Box>
          <Button
            colorPalette="accent"
            onClick={() => {
              setFormError(undefined);
              setFormEditing(null);
              setFormOpen(true);
            }}
            data-testid="pricing-create-button"
          >
            New pricing
          </Button>
        </HStack>

        <DataTable<Pricing>
          data={rows}
          columns={columns}
          isLoading={listQuery.isLoading}
          getRowId={(row) => String(row.id)}
          aria-label="Pricing"
          emptyState={
            <Text color="fg.muted">
              No active pricing rows — click “New pricing” to add one.
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

      <PricingFormDialog
        isOpen={formOpen}
        editing={formEditing}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setFormEditing(null);
            setFormError(undefined);
          }
        }}
        onSubmit={handleSubmit}
        isSubmitting={upsert.isPending}
        submissionError={formError}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Archive this pricing row?"
        description={
          deleteTarget
            ? `Requests using "${deleteTarget.model_id}" will fall back to the default rate until a new row is added. This cannot be undone.`
            : ''
        }
        confirmLabel="Archive"
        destructive
        onConfirm={handleDelete}
        isConfirming={remove.isPending}
      />
    </Container>
  );
}
