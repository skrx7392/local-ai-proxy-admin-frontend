import type {
  CanonicalTimeseriesFilters,
  CanonicalUsageFilters,
} from '@/features/usage/filters';

// Central query-key factory. Every hook reads/invalidates through this
// object so typos or key drift between fetchers and invalidators are a
// compile error instead of a silent cache miss.
//
// Convention: `qk.<resource>.list(filters)` / `qk.<resource>.detail(id)`.
// Filter objects are included verbatim in the key, which means react-query
// treats two filter objects as equal only when their JSON shape matches.
// Always construct filter objects with a stable key order (or use the
// per-feature `FiltersSchema.parse()` result, which Zod orders for you).

export type Pagination = { limit?: number; offset?: number };

export type KeysFilters = Pagination & { is_active?: boolean };
export type UsersFilters = Pagination & { role?: string; is_active?: boolean };
export type AccountsFilters = Pagination & { type?: string; is_active?: boolean };
export type PricingFilters = Pagination;
export type RegistrationTokensFilters = Pagination & { is_active?: boolean };
export type RegistrationsFilters = Pagination;

// Usage analytics keys take an already-canonicalized filter shape (see
// src/features/usage/filters.ts::canonicalizeUsageFilters). Never pass raw
// URLSearchParams or Date objects here — react-query keys a query by JSON
// equivalence and Date instances never compare equal across re-renders.
//
// `interval` is only part of the timeseries key so a Summary/By-Model/By-User
// tab switch doesn't invalidate the timeseries cache and vice versa.

export const qk = {
  keys: {
    all: ['keys'] as const,
    list: (filters: KeysFilters) => ['keys', 'list', filters] as const,
    detail: (id: number) => ['keys', 'detail', id] as const,
  },
  users: {
    all: ['users'] as const,
    list: (filters: UsersFilters) => ['users', 'list', filters] as const,
    detail: (id: number) => ['users', 'detail', id] as const,
  },
  accounts: {
    all: ['accounts'] as const,
    list: (filters: AccountsFilters) => ['accounts', 'list', filters] as const,
    detail: (id: number) => ['accounts', 'detail', id] as const,
  },
  pricing: {
    all: ['pricing'] as const,
    list: (filters: PricingFilters) => ['pricing', 'list', filters] as const,
  },
  registrationTokens: {
    all: ['registrationTokens'] as const,
    list: (filters: RegistrationTokensFilters) =>
      ['registrationTokens', 'list', filters] as const,
  },
  registrations: {
    all: ['registrations'] as const,
    list: (filters: RegistrationsFilters) =>
      ['registrations', 'list', filters] as const,
  },
  config: {
    all: ['config'] as const,
    snapshot: () => ['config', 'snapshot'] as const,
  },
  health: {
    all: ['health'] as const,
    status: () => ['health', 'status'] as const,
  },
  usage: {
    all: ['usage'] as const,
    summary: (filters: CanonicalUsageFilters) =>
      ['usage', 'summary', pickUsageFilters(filters)] as const,
    byModel: (filters: CanonicalUsageFilters) =>
      ['usage', 'byModel', pickUsageFilters(filters)] as const,
    byUser: (filters: CanonicalUsageFilters) =>
      ['usage', 'byUser', pickUsageFilters(filters)] as const,
    timeseries: (filters: CanonicalTimeseriesFilters) =>
      ['usage', 'timeseries', pickTimeseriesFilters(filters)] as const,
  },
} as const;

// Project to just the base usage fields so an upstream caller that
// accidentally forwards a timeseries filter (with `interval`) to a
// summary/byModel/byUser key doesn't silently carve out a second cache
// entry per interval value. Key order must stay stable.
function pickUsageFilters(f: CanonicalUsageFilters): CanonicalUsageFilters {
  const out: CanonicalUsageFilters = { since: f.since, until: f.until };
  if (f.model !== undefined) out.model = f.model;
  if (f.account_id !== undefined) out.account_id = f.account_id;
  if (f.api_key_id !== undefined) out.api_key_id = f.api_key_id;
  if (f.user_id !== undefined) out.user_id = f.user_id;
  return out;
}

function pickTimeseriesFilters(
  f: CanonicalTimeseriesFilters,
): CanonicalTimeseriesFilters {
  const base = pickUsageFilters(f);
  return f.interval !== undefined ? { ...base, interval: f.interval } : base;
}
