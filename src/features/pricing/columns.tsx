'use client';

import { Button, HStack, Text, VStack } from '@chakra-ui/react';
import type { ColumnDef } from '@tanstack/react-table';

import type { Pricing } from './schemas';

// Rates are credits per 1M tokens (per-MTok) since backend PR #54 — the
// wire value is already the human-scale number, so display it as-is
// (no unit conversion). Up to 6 decimals matches backend storage.
const perMtok = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

export function buildPricingColumns(options: {
  onEdit: (pricing: Pricing) => void;
  onDelete: (pricing: Pricing) => void;
}): ColumnDef<Pricing, unknown>[] {
  return [
    {
      accessorKey: 'model_id',
      header: 'Model',
      cell: ({ row }) => (
        <Text
          fontFamily="mono"
          fontSize="sm"
          fontWeight="medium"
          data-testid={`pricing-model-${row.original.id}`}
        >
          {row.original.model_id}
        </Text>
      ),
    },
    {
      accessorKey: 'prompt_rate_per_mtok',
      header: 'Prompt',
      cell: ({ row }) => (
        <VStack align="flex-start" gap="0">
          <Text>{perMtok.format(row.original.prompt_rate_per_mtok)}</Text>
          <Text fontSize="xs" color="fg.muted">
            credits / 1M tokens
          </Text>
        </VStack>
      ),
    },
    {
      accessorKey: 'completion_rate_per_mtok',
      header: 'Completion',
      cell: ({ row }) => (
        <VStack align="flex-start" gap="0">
          <Text>
            {perMtok.format(row.original.completion_rate_per_mtok)}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            credits / 1M tokens
          </Text>
        </VStack>
      ),
    },
    {
      accessorKey: 'typical_completion',
      header: 'Typical completion',
      cell: ({ row }) => (
        <Text>{row.original.typical_completion.toLocaleString()} tokens</Text>
      ),
    },
    {
      id: 'actions',
      header: '',
      size: 200,
      cell: ({ row }) => (
        <HStack justify="flex-end" gap="1">
          <Button
            size="xs"
            variant="ghost"
            onClick={() => options.onEdit(row.original)}
            data-testid={`pricing-edit-${row.original.id}`}
          >
            Edit
          </Button>
          <Button
            size="xs"
            variant="ghost"
            colorPalette="red"
            onClick={() => options.onDelete(row.original)}
            data-testid={`pricing-delete-${row.original.id}`}
          >
            Archive
          </Button>
        </HStack>
      ),
    },
  ];
}
