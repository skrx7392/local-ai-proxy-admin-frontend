import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { qk } from '@/lib/query/keys';

import { AdminHealthSchema, type AdminHealth } from './schemas';

// Backend returns 503 when any check fails. That's still a valid
// snapshot — tolerate it so the topbar can render a red dot instead
// of a query-error state.
const HEALTH_ALLOWED = [503] as const;

// Refresh cadence matches how fast an operator expects the dot to
// reflect reality. 30s is a reasonable floor — shorter burns BFF +
// backend round-trips; longer makes the dot feel stale after a
// deploy or a probe flip. `refetchIntervalInBackground: false`
// keeps an idle browser tab from pinging on a laptop lid close.
export function useAdminHealth() {
  return useQuery<AdminHealth>({
    queryKey: qk.health.status(),
    queryFn: async () => {
      const raw = await apiFetch<unknown>('/health', {
        allowedStatuses: HEALTH_ALLOWED,
      });
      return AdminHealthSchema.parse(raw);
    },
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: false,
  });
}
