import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/api/errors';

// One factory per render tree so SSR can create a fresh client per request
// if needed and tests can get a pristine instance.
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Admin data shifts on human timescales — 30s is a good balance
        // between "see my own change reflected" and not hammering the BFF
        // on every page switch. Tighten if feedback says otherwise.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        // Retry transient network / 5xx up to 2 times; never retry 4xx
        // because those are intent bugs (bad filters, conflicts, auth).
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        // Mutations are user-initiated and surface their own error UI —
        // retrying would cause confusing double-writes (grant credits twice).
        retry: false,
      },
    },
  });
}
