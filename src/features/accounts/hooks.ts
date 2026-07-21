import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { parseDataEnvelope, parseEnvelope } from '@/lib/api/envelope';
import { qk, type AccountsFilters } from '@/lib/query/keys';

import { CreatedKeySchema, type CreatedKey } from '@/features/keys/schemas';

import {
  AccountSchema,
  CreditRequestSchema,
  GrantCreditsResponseSchema,
  ResolveCreditRequestResponseSchema,
  SetAllowanceResponseSchema,
  type AccountKeyFormValues,
  type CreditRequest,
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

// Pending credit requests (docs/design/credit-requests.md): the actionable
// "someone hit their monthly cap" queue shown above the accounts table.
export function useCreditRequests(status: string = 'pending') {
  return useQuery({
    queryKey: qk.creditRequests.list(status),
    queryFn: async () => {
      const raw = await apiFetch<unknown>('/credit-requests', {
        params: { status },
      });
      return parseEnvelope(raw, CreditRequestSchema);
    },
  });
}

export function useResolveCreditRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: number;
      status: 'granted' | 'dismissed';
      note?: string;
    }) => {
      const raw = await apiFetch<unknown>(`/credit-requests/${input.id}`, {
        method: 'PUT',
        body: { status: input.status, ...(input.note ? { note: input.note } : {}) },
      });
      return parseDataEnvelope(raw, ResolveCreditRequestResponseSchema);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.creditRequests.all });
    },
  });
}

// Top-up = resolve THEN grant, in that order: the pending request is the
// idempotency lock (same contract as the Discord bot), so a raced or stale
// action 409s before any money moves. A grant failure after marking is
// surfaced to the caller for manual follow-up — the safe failure direction.
export function useTopUpCreditRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      request: CreditRequest;
      values: GrantCreditsFormValues;
    }) => {
      const resolveRaw = await apiFetch<unknown>(
        `/credit-requests/${input.request.id}`,
        {
          method: 'PUT',
          body: {
            status: 'granted',
            note: `+$${input.values.amount} via admin console`,
          },
        },
      );
      parseDataEnvelope(resolveRaw, ResolveCreditRequestResponseSchema);
      const grantRaw = await apiFetch<unknown>(
        `/accounts/${input.request.account_id}/credits`,
        {
          method: 'POST',
          body: {
            amount: input.values.amount,
            description:
              input.values.description || 'credit-request top-up via admin console',
          },
        },
      );
      return GrantCreditsResponseSchema.parse(grantRaw);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.creditRequests.all });
      void queryClient.invalidateQueries({ queryKey: qk.accounts.all });
    },
  });
}

// Sets (number) or clears (null → env default) an account's monthly
// allowance override. Takes effect at the next monthly reset.
export function useSetAllowance(accountId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (monthlyGrant: number | null) => {
      if (accountId === null) throw new Error('accountId is required');
      const raw = await apiFetch<unknown>(`/accounts/${accountId}/allowance`, {
        method: 'PUT',
        body: { monthly_grant: monthlyGrant },
      });
      return SetAllowanceResponseSchema.parse(raw);
    },
    onSuccess: () => {
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
