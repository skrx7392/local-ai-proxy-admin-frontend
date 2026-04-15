import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { qk } from '@/lib/query/keys';

import { AdminConfigSchema } from './schemas';

// Config is a static snapshot of the process env at boot time — no
// reason to revalidate often. 5-minute staleness matches the longest
// reasonable attention span for an admin checking build/version.
export function useAdminConfig() {
  return useQuery({
    queryKey: qk.config.snapshot(),
    queryFn: async () => {
      const raw = await apiFetch<unknown>('/config');
      return AdminConfigSchema.parse(raw);
    },
    staleTime: 5 * 60 * 1000,
  });
}
