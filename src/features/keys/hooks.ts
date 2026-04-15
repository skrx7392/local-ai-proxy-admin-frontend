import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { parseDataEnvelope, parseEnvelope } from '@/lib/api/envelope';
import { qk, type KeysFilters } from '@/lib/query/keys';

import {
  CreatedKeySchema,
  KeyDetailSchema,
  KeySchema,
  UpdateSessionLimitResponseSchema,
  type CreateKeyFormValues,
  type CreatedKey,
  type KeyDetail,
  type UpdateRateLimitFormValues,
  type UpdateSessionLimitFormValues,
} from './schemas';

export function useKeysList(filters: KeysFilters) {
  return useQuery({
    queryKey: qk.keys.list(filters),
    queryFn: async () => {
      const raw = await apiFetch<unknown>('/keys', {
        params: {
          limit: filters.limit,
          offset: filters.offset,
          is_active: filters.is_active,
        },
      });
      return parseEnvelope(raw, KeySchema);
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

export function useKeyDetail(id: number | null) {
  return useQuery({
    queryKey: id !== null ? qk.keys.detail(id) : ['keys', 'detail', 'disabled'],
    enabled: id !== null,
    queryFn: async () => {
      const raw = await apiFetch<unknown>(`/keys/${id}`);
      return parseDataEnvelope(raw, KeyDetailSchema);
    },
  });
}

export function useUpdateKeyRateLimit(id: number) {
  const queryClient = useQueryClient();
  return useMutation<KeyDetail, Error, UpdateRateLimitFormValues>({
    mutationFn: async (values) => {
      const raw = await apiFetch<unknown>(`/keys/${id}/rate-limit`, {
        method: 'PUT',
        body: values,
      });
      return parseDataEnvelope(raw, KeyDetailSchema);
    },
    onSuccess: (fresh) => {
      queryClient.setQueryData(qk.keys.detail(id), fresh);
      void queryClient.invalidateQueries({ queryKey: qk.keys.all });
    },
  });
}

// Session-limit response is NOT enveloped — the backend returns
// `{status: "updated", limit}` directly from `setSessionLimit`. We parse
// the raw shape and patch the detail cache in place instead of trusting a
// round-trip of the full key.
export function useUpdateKeySessionLimit(id: number) {
  const queryClient = useQueryClient();
  return useMutation<
    number | null,
    Error,
    UpdateSessionLimitFormValues
  >({
    mutationFn: async (values) => {
      const raw = await apiFetch<unknown>(`/keys/${id}/session-limit`, {
        method: 'PUT',
        body: { limit: values.limit },
      });
      return UpdateSessionLimitResponseSchema.parse(raw).limit;
    },
    onSuccess: (limit) => {
      const prev = queryClient.getQueryData<KeyDetail>(qk.keys.detail(id));
      if (prev) {
        queryClient.setQueryData<KeyDetail>(qk.keys.detail(id), {
          ...prev,
          session_token_limit: limit,
        });
      } else {
        void queryClient.invalidateQueries({ queryKey: qk.keys.detail(id) });
      }
    },
  });
}
