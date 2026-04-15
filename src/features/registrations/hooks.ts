import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { parseEnvelope } from '@/lib/api/envelope';
import { qk, type RegistrationsFilters } from '@/lib/query/keys';

import { RegistrationEventSchema } from './schemas';

export function useRegistrationsList(filters: RegistrationsFilters) {
  return useQuery({
    queryKey: qk.registrations.list(filters),
    queryFn: async () => {
      const raw = await apiFetch<unknown>('/registrations', {
        params: {
          limit: filters.limit,
          offset: filters.offset,
        },
      });
      return parseEnvelope(raw, RegistrationEventSchema);
    },
  });
}
