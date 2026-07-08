'use client';

import { Box, Button, Container, Heading, HStack, Stack, Text } from '@chakra-ui/react';
import { useMemo, useState } from 'react';

import { DataTable, EmptyState, Pagination } from '@/components/data';
import { ConfirmDialog } from '@/components/dialogs';
import { ApiError } from '@/lib/api/errors';
import { readInt, useListSearchParams } from '@/lib/url/listState';

import { canonicalizeUsageFilters, quickPickRange } from '@/features/usage/filters';
import { useUsageByModel } from '@/features/usage/hooks';
import { PricingFormDialog } from '@/features/pricing/PricingFormDialog';
import { UnpricedModelsNotice } from '@/features/pricing/UnpricedModelsNotice';
import { buildPricingColumns } from '@/features/pricing/columns';
import {
  useDeletePricing,
  usePricingList,
  useUpsertPricing,
} from '@/features/pricing/hooks';
import {
  isPricingRateOutlier,
  type Pricing,
  type PricingFormValues,
} from '@/features/pricing/schemas';
import { findUnpricedServingModels } from '@/features/pricing/unpriced';

// Pull the full active catalog (not just the visible page) for the outlier
// baseline and the unpriced cross-reference. 500 is the backend's max page size.
const FULL_CATALOG_FILTERS = { limit: 500, offset: 0 } as const;

export default function PricingPage() {
  const { searchParams, update } = useListSearchParams();
  const limit = readInt(searchParams, 'limit', 25);
  const offset = readInt(searchParams, 'offset', 0);

  const [formOpen, setFormOpen] = useState(false);
  const [formEditing, setFormEditing] = useState<Pricing | null>(null);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [prefillModelId, setPrefillModelId] = useState<string | undefined>(
    undefined,
  );

  const [deleteTarget, setDeleteTarget] = useState<Pricing | null>(null);
  // A submitted-but-suspicious set of values, held pending explicit confirmation.
  const [outlierPending, setOutlierPending] = useState<PricingFormValues | null>(
    null,
  );

  const listQuery = usePricingList({ limit, offset });
  const fullCatalogQuery = usePricingList(FULL_CATALOG_FILTERS);
  const upsert = useUpsertPricing();
  const remove = useDeletePricing();

  // Models that served traffic in the last 30 days, to cross-reference against
  // the priced catalog. Frozen for the component's lifetime so the query key
  // (and thus the cache entry) stays stable across renders.
  const servingFilters = useMemo(
    () => canonicalizeUsageFilters(quickPickRange('30d')),
    [],
  );
  const servingUsageQuery = useUsageByModel(servingFilters);

  const columns = useMemo(
    () =>
      buildPricingColumns({
        onEdit: (pricing) => {
          setFormError(undefined);
          setPrefillModelId(undefined);
          setFormEditing(pricing);
          setFormOpen(true);
        },
        onDelete: (pricing) => setDeleteTarget(pricing),
      }),
    [],
  );

  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.pagination.total ?? 0;

  // Full active catalog — used for the outlier baseline and the unpriced
  // cross-reference. Referenced directly (not via a memoized value) so the
  // `?? []` fallback can't churn hook dependencies.
  const fullCatalog = fullCatalogQuery.data?.data ?? [];

  const unpricedModels = useMemo(
    () =>
      findUnpricedServingModels(
        servingUsageQuery.data?.data ?? [],
        (fullCatalogQuery.data?.data ?? []).map((p) => p.model_id),
      ),
    [servingUsageQuery.data, fullCatalogQuery.data],
  );

  function runUpsert(values: PricingFormValues): void {
    upsert.mutate(values, {
      onSuccess: () => {
        setFormOpen(false);
        setFormEditing(null);
        setPrefillModelId(undefined);
      },
      onError: (error) => {
        setFormError(
          error instanceof ApiError ? error.message : 'Failed to save pricing.',
        );
      },
    });
  }

  function handleSubmit(values: PricingFormValues): void {
    setFormError(undefined);
    // Baseline = every OTHER active row's rates (re-saving a row isn't an
    // outlier against its own value).
    const baseline = fullCatalog
      .filter((p) => !(formEditing && p.id === formEditing.id))
      .flatMap((p) => [p.prompt_rate_per_mtok, p.completion_rate_per_mtok]);

    if (isPricingRateOutlier(values, baseline)) {
      setOutlierPending(values);
      return;
    }
    runUpsert(values);
  }

  function confirmOutlier(): void {
    const values = outlierPending;
    setOutlierPending(null);
    if (values) runUpsert(values);
  }

  function handleDelete(): void {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  function openCreate(modelId?: string): void {
    setFormError(undefined);
    setFormEditing(null);
    setPrefillModelId(modelId);
    setFormOpen(true);
  }

  return (
    <Container maxW="6xl" paddingBlock="8" paddingInline="6">
      <Stack gap="6">
        <HStack justify="space-between" align="flex-start">
          <Box>
            <Heading textStyle="heading.md">Pricing</Heading>
            <Text color="fg.muted" textStyle="body.sm">
              Per-model prompt and completion rates in credits per 1M tokens.
              Only active rows are listed; archiving soft-deletes.
            </Text>
          </Box>
          <Button
            colorPalette="accent"
            onClick={() => openCreate()}
            data-testid="pricing-create-button"
          >
            New pricing
          </Button>
        </HStack>

        <UnpricedModelsNotice
          models={unpricedModels}
          onAddPricing={(model) => openCreate(model)}
        />

        <DataTable<Pricing>
          data={rows}
          columns={columns}
          isLoading={listQuery.isLoading}
          getRowId={(row) => String(row.id)}
          aria-label="Pricing"
          emptyState={
            <EmptyState
              title="No active pricing rows"
              description="Click “New pricing” to add one."
            />
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

      <PricingFormDialog
        isOpen={formOpen}
        editing={formEditing}
        prefillModelId={prefillModelId}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setFormEditing(null);
            setFormError(undefined);
            setPrefillModelId(undefined);
          }
        }}
        onSubmit={handleSubmit}
        isSubmitting={upsert.isPending}
        submissionError={formError}
      />

      <ConfirmDialog
        isOpen={outlierPending !== null}
        onOpenChange={(open) => {
          if (!open) setOutlierPending(null);
        }}
        title="Unusually high rate"
        description={
          outlierPending
            ? `The rate you entered for "${outlierPending.model_id}" is far above your existing pricing — an order of magnitude higher. Double-check it isn't a per-token value in a per-1M-token field. Save it anyway?`
            : ''
        }
        confirmLabel="Save anyway"
        cancelLabel="Go back"
        onConfirm={confirmOutlier}
        isConfirming={upsert.isPending}
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
