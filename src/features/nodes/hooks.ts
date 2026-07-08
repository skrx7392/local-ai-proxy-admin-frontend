import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import {
  parseDataEnvelope,
  parseEnvelope,
  type EnvelopeResult,
} from '@/lib/api/envelope';
import { qk, type NodesFilters } from '@/lib/query/keys';

import {
  NodeSchema,
  type CreateNodePayload,
  type Node,
  type UpdateNodePayload,
} from './schemas';

export function useNodesList(filters: NodesFilters) {
  return useQuery({
    queryKey: qk.nodes.list(filters),
    queryFn: async () => {
      const raw = await apiFetch<unknown>('/nodes', {
        params: {
          limit: filters.limit,
          offset: filters.offset,
        },
      });
      return parseEnvelope(raw, NodeSchema);
    },
  });
}

// Create / update / refresh all return the full nodeDTO including the
// result of the synchronous probe the backend runs on write, so callers
// get real initial health instead of "unknown".

export function useCreateNode() {
  const queryClient = useQueryClient();
  return useMutation<Node, Error, CreateNodePayload>({
    mutationFn: async (payload) => {
      const raw = await apiFetch<unknown>('/nodes', {
        method: 'POST',
        body: payload,
      });
      return parseDataEnvelope(raw, NodeSchema);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.nodes.all });
      // Node health rolls up into /admin/health — keep the topbar dot fresh.
      void queryClient.invalidateQueries({ queryKey: qk.health.all });
    },
  });
}

export function useUpdateNode() {
  const queryClient = useQueryClient();
  return useMutation<Node, Error, { id: number; payload: UpdateNodePayload }>({
    mutationFn: async ({ id, payload }) => {
      const raw = await apiFetch<unknown>(`/nodes/${id}`, {
        method: 'PUT',
        body: payload,
      });
      return parseDataEnvelope(raw, NodeSchema);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.nodes.all });
      void queryClient.invalidateQueries({ queryKey: qk.health.all });
    },
  });
}

// DELETE disables the node (soft-delete: usage rows keep referencing it)
// and removes it from routing before the 204 comes back.
export function useDeleteNode() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await apiFetch<unknown>(`/nodes/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.nodes.all });
      void queryClient.invalidateQueries({ queryKey: qk.health.all });
    },
  });
}

// Forces an immediate probe + model rediscovery. The response carries the
// node's fresh live state; write it through to every cached list so the
// row updates instantly, then invalidate to converge with the server.
export function useRefreshNode() {
  const queryClient = useQueryClient();
  return useMutation<Node, Error, number>({
    mutationFn: async (id) => {
      const raw = await apiFetch<unknown>(`/nodes/${id}/refresh`, {
        method: 'POST',
      });
      return parseDataEnvelope(raw, NodeSchema);
    },
    onSuccess: (node) => {
      queryClient.setQueriesData<EnvelopeResult<Node>>(
        { queryKey: [...qk.nodes.all, 'list'] },
        (current) =>
          current
            ? {
                ...current,
                data: current.data.map((n) => (n.id === node.id ? node : n)),
              }
            : current,
      );
      queryClient.setQueryData(qk.nodes.detail(node.id), node);
      void queryClient.invalidateQueries({ queryKey: qk.health.all });
    },
  });
}
