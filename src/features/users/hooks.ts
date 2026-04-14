import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { legacyOrEnvelope } from '@/lib/api/envelope';
import { qk, type UsersFilters } from '@/lib/query/keys';

import { UserSchema } from './schemas';

export function useUsersList(filters: UsersFilters) {
  return useQuery({
    queryKey: qk.users.list(filters),
    queryFn: async () => {
      const raw = await apiFetch<unknown>('/users', {
        params: {
          envelope: 1,
          limit: filters.limit,
          offset: filters.offset,
          role: filters.role,
          is_active: filters.is_active,
        },
      });
      return legacyOrEnvelope(raw, UserSchema);
    },
  });
}

export function useActivateUser() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await apiFetch<unknown>(`/users/${id}/activate`, { method: 'PUT' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.users.all });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await apiFetch<unknown>(`/users/${id}/deactivate`, { method: 'PUT' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.users.all });
    },
  });
}
