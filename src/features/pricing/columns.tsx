'use client';

import { Button, HStack, Text, VStack } from '@chakra-ui/react';
import type { ColumnDef } from '@tanstack/react-table';

import type { Pricing } from './schemas';

// Rates are dollars-per-token floats. Display as $/1M tokens so the
// numbers are readable at a glance (a $0.00005/token rate becomes
// $50/1M which is how pricing pages typically quote it).
const perMillion = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
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
      accessorKey: 'prompt_rate',
      header: 'Prompt',
      cell: ({ row }) => (
        <VStack align="flex-start" gap="0">
          <Text>{perMillion.format(row.original.prompt_rate * 1_000_000)}</Text>
          <Text fontSize="xs" color="fg.muted">
            / 1M tokens
          </Text>
        </VStack>
      ),
    },
    {
      accessorKey: 'completion_rate',
      header: 'Completion',
      cell: ({ row }) => (
        <VStack align="flex-start" gap="0">
          <Text>
            {perMillion.format(row.original.completion_rate * 1_000_000)}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            / 1M tokens
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
