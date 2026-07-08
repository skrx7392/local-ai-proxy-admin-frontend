'use client';

import { Badge, Button, HStack, Text } from '@chakra-ui/react';
import type { ColumnDef } from '@tanstack/react-table';
import NextLink from 'next/link';

import type { Node, NodeHealth } from './schemas';

const HEALTH_PALETTE: Record<NodeHealth, string> = {
  healthy: 'green',
  unhealthy: 'red',
  unknown: 'gray',
};

const CONFIG_SOURCED_HINT =
  'Managed by the nodes config file (NODES_FILE) — read-only via the admin API';

function formatChecked(iso: string | null): string {
  if (!iso) return 'never';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

// Native `title` tooltips throughout: the health badge carries last_error +
// last_checked_at, the models cell carries the full list. Keeps the table
// dependency-free and the content assertable in tests.
function healthTitle(node: Node): string {
  const checked = `Last checked: ${formatChecked(node.last_checked_at)}`;
  if (node.health === 'unhealthy') {
    const error = node.last_error ? `${node.last_error}. ` : '';
    return `Confirmed down (2+ consecutive probe failures). ${error}${checked}`;
  }
  if (node.health === 'unknown') {
    return `Not probed yet. ${checked}`;
  }
  return checked;
}

const MODELS_SHOWN = 2;

export function buildNodeColumns(options: {
  onEdit: (node: Node) => void;
  onDisable: (node: Node) => void;
  onRefresh: (node: Node) => void;
  refreshingId?: number | undefined;
}): ColumnDef<Node, unknown>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <Text
          fontFamily="mono"
          fontSize="sm"
          fontWeight="medium"
          data-testid={`node-name-${row.original.id}`}
        >
          {row.original.name}
        </Text>
      ),
    },
    {
      accessorKey: 'backend_type',
      header: 'Backend',
      cell: ({ row }) => (
        <Text fontSize="sm" color="fg.muted" title={row.original.base_url}>
          {row.original.backend_type}
        </Text>
      ),
    },
    {
      accessorKey: 'health',
      header: 'Health',
      cell: ({ row }) => (
        <Badge
          colorPalette={HEALTH_PALETTE[row.original.health]}
          title={healthTitle(row.original)}
          data-testid={`node-health-${row.original.id}`}
          data-health={row.original.health}
        >
          {row.original.health}
        </Badge>
      ),
    },
    {
      accessorKey: 'models',
      header: 'Models',
      cell: ({ row }) => {
        const { models, static_models } = row.original;
        if (models.length === 0) {
          return (
            <Text fontSize="xs" color="fg.subtle">
              none
            </Text>
          );
        }
        const shown = models.slice(0, MODELS_SHOWN).join(', ');
        const more = models.length - MODELS_SHOWN;
        return (
          <Text
            fontSize="xs"
            fontFamily="mono"
            title={models.join(', ')}
            data-testid={`node-models-${row.original.id}`}
          >
            {shown}
            {more > 0 ? ` +${more}` : ''}
            {static_models !== null ? ' (static)' : ''}
          </Text>
        );
      },
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ row }) =>
        row.original.source === 'config' ? (
          <Badge
            colorPalette="purple"
            title={CONFIG_SOURCED_HINT}
            data-testid={`node-source-${row.original.id}`}
          >
            config
          </Badge>
        ) : (
          <Badge
            variant="outline"
            data-testid={`node-source-${row.original.id}`}
          >
            api
          </Badge>
        ),
    },
    {
      accessorKey: 'enabled',
      header: 'Enabled',
      cell: ({ row }) => (
        <Badge
          colorPalette={row.original.enabled ? 'green' : 'gray'}
          data-testid={`node-enabled-${row.original.id}`}
        >
          {row.original.enabled ? 'enabled' : 'disabled'}
        </Badge>
      ),
    },
    {
      accessorKey: 'last_checked_at',
      header: 'Last checked',
      cell: ({ row }) => (
        <Text fontSize="xs" color="fg.muted">
          {formatChecked(row.original.last_checked_at)}
        </Text>
      ),
    },
    {
      id: 'actions',
      header: '',
      size: 280,
      cell: ({ row }) => {
        const node = row.original;
        const configSourced = node.source === 'config';
        return (
          <HStack justify="flex-end" gap="1">
            <Button
              size="xs"
              variant="ghost"
              onClick={() => options.onRefresh(node)}
              loading={options.refreshingId === node.id}
              data-testid={`node-refresh-${node.id}`}
            >
              Refresh
            </Button>
            <Button size="xs" variant="ghost" asChild>
              <NextLink
                href={`/usage?node_id=${node.id}`}
                data-testid={`node-usage-${node.id}`}
              >
                Usage
              </NextLink>
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => options.onEdit(node)}
              disabled={configSourced}
              title={configSourced ? CONFIG_SOURCED_HINT : undefined}
              data-testid={`node-edit-${node.id}`}
            >
              Edit
            </Button>
            <Button
              size="xs"
              variant="ghost"
              colorPalette="red"
              onClick={() => options.onDisable(node)}
              disabled={configSourced || !node.enabled}
              title={configSourced ? CONFIG_SOURCED_HINT : undefined}
              data-testid={`node-disable-${node.id}`}
            >
              Disable
            </Button>
          </HStack>
        );
      },
    },
  ];
}
