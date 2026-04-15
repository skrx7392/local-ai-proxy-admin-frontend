import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { parseEnvelope } from '@/lib/api/envelope';
import { qk, type PricingFilters } from '@/lib/query/keys';

import { PricingSchema, type PricingFormValues } from './schemas';

export function usePricingList(filters: PricingFilters) {
  return useQuery({
    queryKey: qk.pricing.list(filters),
    queryFn: async () => {
      const raw = await apiFetch<unknown>('/pricing', {
        params: {
          limit: filters.limit,
          offset: filters.offset,
        },
      });
      return parseEnvelope(raw, PricingSchema);
    },
  });
}

export function useUpsertPricing() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, PricingFormValues>({
    mutationFn: async (values) => {
      await apiFetch<unknown>('/pricing', { method: 'POST', body: values });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.pricing.all });
    },
  });
}

export function useDeletePricing() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await apiFetch<unknown>(`/pricing/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.pricing.all });
    },
  });
}
