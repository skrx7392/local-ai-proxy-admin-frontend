import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { parseDataEnvelope, parseEnvelope } from '@/lib/api/envelope';
import { qk, type ListPage } from '@/lib/query/keys';

import type {
  CanonicalTimeseriesFilters,
  CanonicalUsageFilters,
} from './filters';
import {
  AccountUsageRowSchema,
  ModelUsageSchema,
  TimeseriesResponseSchema,
  UsageSummarySchema,
} from './schemas';

// Each hook takes an already-canonicalized filter object (see
// canonicalizeUsageFilters / canonicalizeTimeseriesFilters). If the caller
// passes `null` (e.g. invalid date range), the hook stays disabled and the
// network request is skipped — matches the "omit invalid values rather than
// send confusing requests" rule from the FE F notes.

export function useUsageSummary(filters: CanonicalUsageFilters | null) {
  return useQuery({
    enabled: filters !== null,
    queryKey: filters
      ? qk.usage.summary(filters)
      : (['usage', 'summary', 'disabled'] as const),
    queryFn: async () => {
      const raw = await apiFetch<unknown>('/usage/summary', {
        params: paramsFromFilters(filters!),
      });
      return parseDataEnvelope(raw, UsageSummarySchema);
    },
  });
}

// Default page mirrors the backend's default pagination window, for callers
// that want "the top of the list" without paging UI (e.g. the Pricing page's
// serving-model usage probe).
const DEFAULT_LIST_PAGE: ListPage = { limit: 100, offset: 0 };

export function useUsageByModel(
  filters: CanonicalUsageFilters | null,
  page: ListPage = DEFAULT_LIST_PAGE,
) {
  return useQuery({
    enabled: filters !== null,
    queryKey: filters
      ? qk.usage.byModel(filters, page)
      : (['usage', 'byModel', 'disabled'] as const),
    queryFn: async () => {
      const raw = await apiFetch<unknown>('/usage/by-model', {
        params: {
          ...paramsFromFilters(filters!),
          limit: page.limit,
          offset: page.offset,
        },
      });
      return parseEnvelope(raw, ModelUsageSchema);
    },
  });
}

export function useUsageByAccount(
  filters: CanonicalUsageFilters | null,
  page: ListPage = DEFAULT_LIST_PAGE,
) {
  return useQuery({
    enabled: filters !== null,
    queryKey: filters
      ? qk.usage.byAccount(filters, page)
      : (['usage', 'byAccount', 'disabled'] as const),
    queryFn: async () => {
      const raw = await apiFetch<unknown>('/usage/by-account', {
        params: {
          ...paramsFromFilters(filters!),
          limit: page.limit,
          offset: page.offset,
        },
      });
      return parseEnvelope(raw, AccountUsageRowSchema);
    },
  });
}

export function useUsageTimeseries(filters: CanonicalTimeseriesFilters | null) {
  return useQuery({
    enabled: filters !== null,
    queryKey: filters
      ? qk.usage.timeseries(filters)
      : (['usage', 'timeseries', 'disabled'] as const),
    queryFn: async () => {
      const params = paramsFromFilters(filters!);
      if (filters!.interval) params.interval = filters!.interval;
      const raw = await apiFetch<unknown>('/usage/timeseries', { params });
      return parseDataEnvelope(raw, TimeseriesResponseSchema);
    },
  });
}

function paramsFromFilters(
  f: CanonicalUsageFilters,
): Record<string, string | number | undefined> {
  const out: Record<string, string | number | undefined> = {
    since: f.since,
    until: f.until,
  };
  if (f.model) out.model = f.model;
  if (f.account_id !== undefined) out.account_id = f.account_id;
  if (f.api_key_id !== undefined) out.api_key_id = f.api_key_id;
  if (f.user_id !== undefined) out.user_id = f.user_id;
  if (f.node_id !== undefined) out.node_id = f.node_id;
  return out;
}
