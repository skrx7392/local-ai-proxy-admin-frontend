import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { parseDataEnvelope, parseEnvelope } from '@/lib/api/envelope';
import { qk, type UsersFilters } from '@/lib/query/keys';

import {
  UserDetailSchema,
  UserSchema,
  type UserDetail,
  type UserRole,
} from './schemas';

export function useUsersList(filters: UsersFilters) {
  return useQuery({
    queryKey: qk.users.list(filters),
    queryFn: async () => {
      const raw = await apiFetch<unknown>('/users', {
        params: {
          limit: filters.limit,
          offset: filters.offset,
          role: filters.role,
          is_active: filters.is_active,
        },
      });
      return parseEnvelope(raw, UserSchema);
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

export function useUserDetail(id: number | null) {
  return useQuery({
    queryKey: id !== null ? qk.users.detail(id) : ['users', 'detail', 'disabled'],
    enabled: id !== null,
    queryFn: async () => {
      const raw = await apiFetch<unknown>(`/users/${id}`);
      return parseDataEnvelope(raw, UserDetailSchema);
    },
  });
}

// Count of active admins across the whole org. Used as the client-side
// "last-admin guard": if this equals 1 and the user being edited is that
// admin, the demote action is disabled pre-flight. The backend is still the
// authority (409 `last_admin`) — this just saves an obvious round-trip and
// gives a clearer affordance.
export function useActiveAdminCount() {
  return useQuery({
    queryKey: qk.users.list({ role: 'admin', is_active: true, limit: 2, offset: 0 }),
    queryFn: async () => {
      const raw = await apiFetch<unknown>('/users', {
        params: { role: 'admin', is_active: true, limit: 2, offset: 0 },
      });
      return parseEnvelope(raw, UserSchema).pagination.total;
    },
  });
}

// Optimistic role change. Writes the new role into the detail cache before
// the request settles so the UI flips instantly; rolls back on error. The
// backend returns the re-fetched user detail on success, which we use to
// overwrite the optimistic snapshot with server-truth (picks up the new
// `updated_at`).
export function useChangeUserRole(id: number) {
  const queryClient = useQueryClient();
  return useMutation<
    UserDetail,
    Error,
    UserRole,
    { previous: UserDetail | undefined }
  >({
    mutationFn: async (role) => {
      const raw = await apiFetch<unknown>(`/users/${id}/role`, {
        method: 'PUT',
        body: { role },
      });
      return parseDataEnvelope(raw, UserDetailSchema);
    },
    onMutate: async (role) => {
      await queryClient.cancelQueries({ queryKey: qk.users.detail(id) });
      const previous = queryClient.getQueryData<UserDetail>(qk.users.detail(id));
      if (previous) {
        queryClient.setQueryData<UserDetail>(qk.users.detail(id), {
          ...previous,
          role,
        });
      }
      return { previous };
    },
    onError: (_err, _role, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(qk.users.detail(id), ctx.previous);
      }
    },
    onSuccess: (fresh) => {
      queryClient.setQueryData(qk.users.detail(id), fresh);
    },
    onSettled: () => {
      // List rows show role badges; invalidate so they re-fetch.
      void queryClient.invalidateQueries({ queryKey: qk.users.all });
    },
  });
}
