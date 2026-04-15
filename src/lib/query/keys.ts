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
} as const;
