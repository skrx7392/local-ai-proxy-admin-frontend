// Stable fixtures used by both the Vitest MSW handlers and the
// Playwright mockBackend. Keeping them in one module means the two
// runtimes never diverge, and updating a shape in one place takes
// care of all tests at once.

export const keys = [
  {
    id: 101,
    name: 'frontend-dev',
    key_prefix: 'sk_live_abc',
    is_active: true,
    rate_limit: 60,
    created_at: '2026-01-12T10:00:00Z',
    last_used_at: '2026-04-14T09:30:00Z',
    user_id: 1,
    account_id: null,
  },
  {
    id: 102,
    name: 'batch-worker',
    key_prefix: 'sk_live_xyz',
    is_active: true,
    rate_limit: 120,
    created_at: '2026-02-01T14:22:00Z',
    last_used_at: null,
    user_id: 2,
    account_id: 501,
  },
  {
    id: 103,
    name: 'rotated-out',
    key_prefix: 'sk_live_old',
    is_active: false,
    rate_limit: 60,
    created_at: '2025-11-20T09:00:00Z',
    last_used_at: '2026-03-15T12:00:00Z',
    user_id: 1,
    account_id: null,
  },
] as const;

export const users = [
  {
    id: 1,
    email: 'admin@kinvee.in',
    role: 'admin',
    is_active: true,
    created_at: '2025-10-01T00:00:00Z',
  },
  {
    id: 2,
    email: 'ops@kinvee.in',
    role: 'user',
    is_active: true,
    created_at: '2025-12-05T12:00:00Z',
  },
  {
    id: 3,
    email: 'retired@kinvee.in',
    role: 'user',
    is_active: false,
    created_at: '2025-08-15T09:00:00Z',
  },
] as const;

export const accounts = [
  {
    id: 501,
    name: 'Default Admin Account',
    type: 'personal',
    is_active: true,
    credits_remaining: 250000,
    created_at: '2025-10-01T00:00:00Z',
  },
  {
    id: 502,
    name: 'Batch Pipeline',
    type: 'service',
    is_active: true,
    credits_remaining: 1000000,
    created_at: '2026-01-15T00:00:00Z',
  },
] as const;

export const pricing = [
  {
    id: 201,
    model: 'llama3.1:8b',
    input_per_1m: 50,
    output_per_1m: 150,
    is_active: true,
    created_at: '2025-10-01T00:00:00Z',
  },
  {
    id: 202,
    model: 'llama3.1:70b',
    input_per_1m: 500,
    output_per_1m: 1500,
    is_active: true,
    created_at: '2025-10-01T00:00:00Z',
  },
] as const;

export const registrationTokens = [
  {
    id: 301,
    label: 'ops-onboarding',
    token_prefix: 'rt_abc',
    is_active: true,
    credits_grant: 10000,
    created_at: '2026-03-01T00:00:00Z',
    expires_at: '2026-06-01T00:00:00Z',
  },
] as const;
