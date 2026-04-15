import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { parseEnvelope } from '@/lib/api/envelope';
import { qk, type AccountsFilters } from '@/lib/query/keys';

import { CreatedKeySchema, type CreatedKey } from '@/features/keys/schemas';

import {
  AccountSchema,
  GrantCreditsResponseSchema,
  type AccountKeyFormValues,
  type GrantCreditsFormValues,
  type GrantCreditsResponse,
} from './schemas';

export function useAccountsList(filters: AccountsFilters) {
  return useQuery({
    queryKey: qk.accounts.list(filters),
    queryFn: async () => {
      const raw = await apiFetch<unknown>('/accounts', {
        params: {
          limit: filters.limit,
          offset: filters.offset,
          type: filters.type,
          is_active: filters.is_active,
        },
      });
      return parseEnvelope(raw, AccountSchema);
    },
  });
}

export function useGrantCredits(accountId: number | null) {
  const queryClient = useQueryClient();
  return useMutation<GrantCreditsResponse, Error, GrantCreditsFormValues>({
    mutationFn: async (values) => {
      if (accountId === null) throw new Error('accountId is required');
      const raw = await apiFetch<unknown>(`/accounts/${accountId}/credits`, {
        method: 'POST',
        body: values,
      });
      return GrantCreditsResponseSchema.parse(raw);
    },
    onSuccess: () => {
      // A grant changes the balance on the row the user just clicked, so
      // invalidate the list.
      void queryClient.invalidateQueries({ queryKey: qk.accounts.all });
    },
  });
}

export function useCreateAccountKey(accountId: number | null) {
  const queryClient = useQueryClient();
  return useMutation<CreatedKey, Error, AccountKeyFormValues>({
    mutationFn: async (values) => {
      if (accountId === null) throw new Error('accountId is required');
      const raw = await apiFetch<unknown>(`/accounts/${accountId}/keys`, {
        method: 'POST',
        body: values,
      });
      return CreatedKeySchema.parse(raw);
    },
    onSuccess: () => {
      // Keys under this account now exist; the keys feature will pick
      // them up on its next list refresh.
      void queryClient.invalidateQueries({ queryKey: qk.keys.all });
    },
  });
}
