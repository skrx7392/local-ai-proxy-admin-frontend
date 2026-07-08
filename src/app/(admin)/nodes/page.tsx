'use client';

import { Box, Button, Container, Heading, HStack, Stack, Text } from '@chakra-ui/react';
import { useMemo, useState } from 'react';

import { DataTable, EmptyState, Pagination } from '@/components/data';
import { ConfirmDialog } from '@/components/dialogs';
import { ApiError } from '@/lib/api/errors';
import { readInt, useListSearchParams } from '@/lib/url/listState';

import { NodeFormDialog } from '@/features/nodes/NodeFormDialog';
import { buildNodeColumns } from '@/features/nodes/columns';
import {
  useCreateNode,
  useDeleteNode,
  useNodesList,
  useRefreshNode,
  useUpdateNode,
} from '@/features/nodes/hooks';
import {
  toCreatePayload,
  toUpdatePayload,
  type Node,
  type NodeFormValues,
} from '@/features/nodes/schemas';

export default function NodesPage() {
  const { searchParams, update } = useListSearchParams();
  const limit = readInt(searchParams, 'limit', 25);
  const offset = readInt(searchParams, 'offset', 0);

  const [formOpen, setFormOpen] = useState(false);
  const [formEditing, setFormEditing] = useState<Node | null>(null);
  const [formError, setFormError] = useState<string | undefined>(undefined);

  const [disableTarget, setDisableTarget] = useState<Node | null>(null);

  const listQuery = useNodesList({ limit, offset });
  const create = useCreateNode();
  const updateNode = useUpdateNode();
  const remove = useDeleteNode();
  const refresh = useRefreshNode();

  const refreshingId = refresh.isPending ? refresh.variables : undefined;
  // mutation.mutate is referentially stable in react-query v5, so the
  // columns only rebuild when the per-row loading state actually changes.
  const refreshNode = refresh.mutate;

  const columns = useMemo(
    () =>
      buildNodeColumns({
        onEdit: (node) => {
          setFormError(undefined);
          setFormEditing(node);
          setFormOpen(true);
        },
        onDisable: (node) => setDisableTarget(node),
        onRefresh: (node) => refreshNode(node.id),
        refreshingId,
      }),
    [refreshNode, refreshingId],
  );

  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.pagination.total ?? 0;

  function handleSubmit(values: NodeFormValues): void {
    setFormError(undefined);
    const onSuccess = () => {
      setFormOpen(false);
      setFormEditing(null);
    };
    const onError = (error: Error) => {
      setFormError(
        error instanceof ApiError ? error.message : 'Failed to save node.',
      );
    };
    if (formEditing) {
      updateNode.mutate(
        { id: formEditing.id, payload: toUpdatePayload(values) },
        { onSuccess, onError },
      );
    } else {
      create.mutate(toCreatePayload(values), { onSuccess, onError });
    }
  }

  function handleDisable(): void {
    if (!disableTarget) return;
    remove.mutate(disableTarget.id, {
      onSuccess: () => setDisableTarget(null),
    });
  }

  return (
    <Container maxW="6xl" paddingBlock="8" paddingInline="6">
      <Stack gap="6">
        <HStack justify="space-between" align="flex-start">
          <Box>
            <Heading textStyle="heading.md">Nodes</Heading>
            <Text color="fg.muted" textStyle="body.sm">
              Inference backends the gateway routes chat requests to, by
              model. Unhealthy nodes are routed around automatically.
            </Text>
          </Box>
          <Button
            colorPalette="accent"
            onClick={() => {
              setFormError(undefined);
              setFormEditing(null);
              setFormOpen(true);
            }}
            data-testid="node-create-button"
          >
            Register node
          </Button>
        </HStack>

        <DataTable<Node>
          data={rows}
          columns={columns}
          isLoading={listQuery.isLoading}
          getRowId={(row) => String(row.id)}
          aria-label="Nodes"
          emptyState={
            <EmptyState
              title="No nodes configured"
              description="Chat requests return 503 until a node serves the requested model. Register one here, or declare nodes in NODES_FILE / OLLAMA_URL."
              action={
                <Button
                  size="sm"
                  colorPalette="accent"
                  onClick={() => {
                    setFormError(undefined);
                    setFormEditing(null);
                    setFormOpen(true);
                  }}
                  data-testid="node-empty-create-button"
                >
                  Register node
                </Button>
              }
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

      <NodeFormDialog
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
        isSubmitting={create.isPending || updateNode.isPending}
        submissionError={formError}
      />

      <ConfirmDialog
        isOpen={disableTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDisableTarget(null);
        }}
        title="Disable this node?"
        description={
          disableTarget
            ? `"${disableTarget.name}" is removed from routing immediately. ` +
              'Usage history is kept (soft-delete), and the node can be ' +
              're-enabled later from the edit dialog.'
            : ''
        }
        confirmLabel="Disable"
        destructive
        onConfirm={handleDisable}
        isConfirming={remove.isPending}
      />
    </Container>
  );
}
