import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { legacyOrEnvelope } from '@/lib/api/envelope';
import { qk, type KeysFilters } from '@/lib/query/keys';

import {
  CreatedKeySchema,
  KeySchema,
  type CreateKeyFormValues,
  type CreatedKey,
} from './schemas';

export function useKeysList(filters: KeysFilters) {
  return useQuery({
    queryKey: qk.keys.list(filters),
    queryFn: async () => {
      const raw = await apiFetch<unknown>('/keys', {
        params: {
          envelope: 1,
          limit: filters.limit,
          offset: filters.offset,
          is_active: filters.is_active,
        },
      });
      return legacyOrEnvelope(raw, KeySchema);
    },
  });
}

export function useCreateKey() {
  const queryClient = useQueryClient();
  return useMutation<CreatedKey, Error, CreateKeyFormValues>({
    mutationFn: async (values) => {
      const raw = await apiFetch<unknown>('/keys', {
        method: 'POST',
        body: values,
      });
      return CreatedKeySchema.parse(raw);
    },
    onSuccess: () => {
      // Invalidate every list — filters may hide/show the new row.
      void queryClient.invalidateQueries({ queryKey: qk.keys.all });
    },
  });
}

export function useRevokeKey() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await apiFetch<unknown>(`/keys/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.keys.all });
    },
  });
}
