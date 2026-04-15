import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { parseEnvelope } from '@/lib/api/envelope';
import { qk, type RegistrationTokensFilters } from '@/lib/query/keys';

import {
  CreatedRegistrationTokenSchema,
  RegistrationTokenSchema,
  type CreatedRegistrationToken,
  type RegistrationTokenFormValues,
} from './schemas';

export function useRegistrationTokensList(filters: RegistrationTokensFilters) {
  return useQuery({
    queryKey: qk.registrationTokens.list(filters),
    queryFn: async () => {
      const raw = await apiFetch<unknown>('/registration-tokens', {
        params: {
          limit: filters.limit,
          offset: filters.offset,
          is_active: filters.is_active,
        },
      });
      return parseEnvelope(raw, RegistrationTokenSchema);
    },
  });
}

export function useCreateRegistrationToken() {
  const queryClient = useQueryClient();
  return useMutation<
    CreatedRegistrationToken,
    Error,
    RegistrationTokenFormValues
  >({
    mutationFn: async (values) => {
      // Backend expects `expires_at: string | null` (not undefined) to
      // signal "no expiry"; normalize here.
      const payload = {
        name: values.name,
        credit_grant: values.credit_grant,
        max_uses: values.max_uses,
        expires_at: values.expires_at ?? null,
      };
      const raw = await apiFetch<unknown>('/registration-tokens', {
        method: 'POST',
        body: payload,
      });
      return CreatedRegistrationTokenSchema.parse(raw);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: qk.registrationTokens.all,
      });
    },
  });
}

export function useRevokeRegistrationToken() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await apiFetch<unknown>(`/registration-tokens/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: qk.registrationTokens.all,
      });
    },
  });
}
