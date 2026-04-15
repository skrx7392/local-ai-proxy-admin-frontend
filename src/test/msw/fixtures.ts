// Stable fixtures used by both the Vitest MSW handlers and the
// Playwright mockBackend. Keeping them in one module means the two
// runtimes never diverge, and updating a shape in one place takes
// care of all tests at once.

// Shape matches internal/admin/admin.go::keyResponse — the list endpoint
// does NOT return last_used_at / user_id / account_id, and the active
// flag is inverted into `revoked`. A server-side filter of
// ?is_active=true|false is still valid (backend maps to !revoked).
export const keys = [
  {
    id: 101,
    name: 'frontend-dev',
    key_prefix: 'sk-abc12345',
    rate_limit: 60,
    created_at: '2026-01-12T10:00:00Z',
    revoked: false,
  },
  {
    id: 102,
    name: 'batch-worker',
    key_prefix: 'sk-xyz98765',
    rate_limit: 120,
    created_at: '2026-02-01T14:22:00Z',
    revoked: false,
  },
  {
    id: 103,
    name: 'rotated-out',
    key_prefix: 'sk-old11111',
    rate_limit: 60,
    created_at: '2025-11-20T09:00:00Z',
    revoked: true,
  },
] as const;

// Shape matches internal/admin/admin.go::listUsers anonymous response
// struct. Includes `name` alongside email.
export const users = [
  {
    id: 1,
    email: 'admin@kinvee.in',
    name: 'Krishna',
    role: 'admin',
    is_active: true,
    created_at: '2025-10-01T00:00:00Z',
  },
  {
    id: 2,
    email: 'ops@kinvee.in',
    name: 'Ops Bot',
    role: 'user',
    is_active: true,
    created_at: '2025-12-05T12:00:00Z',
  },
  {
    id: 3,
    email: 'retired@kinvee.in',
    name: 'Retired User',
    role: 'user',
    is_active: false,
    created_at: '2025-08-15T09:00:00Z',
  },
] as const;

// Shape matches internal/admin/admin.go::listAccounts accountResponse.
// Balances are floats (dollars, not integer cents) and the list includes
// a pre-computed `available = balance - reserved`.
export const accounts = [
  {
    id: 501,
    name: 'Default Admin Account',
    type: 'personal',
    is_active: true,
    balance: 250.0,
    reserved: 5.25,
    available: 244.75,
    created_at: '2025-10-01T00:00:00Z',
  },
  {
    id: 502,
    name: 'Batch Pipeline',
    type: 'service',
    is_active: true,
    balance: 1000.0,
    reserved: 0.0,
    available: 1000.0,
    created_at: '2026-01-15T00:00:00Z',
  },
] as const;

export const pricing = [
  {
    id: 201,
    model_id: 'llama3.1:8b',
    prompt_rate: 0.00005,
    completion_rate: 0.00015,
    typical_completion: 500,
    effective_from: '2025-10-01T00:00:00Z',
    active: true,
  },
  {
    id: 202,
    model_id: 'llama3.1:70b',
    prompt_rate: 0.0005,
    completion_rate: 0.0015,
    typical_completion: 500,
    effective_from: '2025-10-01T00:00:00Z',
    active: true,
  },
] as const;

// Matches internal/admin/admin.go::listRegistrationTokens tokenResponse.
// Fields: name (not label), credit_grant (singular), max_uses, uses,
// revoked (not is_active), expires_at nullable.
export const registrationTokens = [
  {
    id: 301,
    name: 'ops-onboarding',
    credit_grant: 10.0,
    max_uses: 5,
    uses: 2,
    created_at: '2026-03-01T00:00:00Z',
    expires_at: '2026-06-01T00:00:00Z',
    revoked: false,
  },
  {
    id: 302,
    name: 'contractor-batch',
    credit_grant: 5.0,
    max_uses: 1,
    uses: 0,
    created_at: '2026-04-01T00:00:00Z',
    expires_at: null,
    revoked: false,
  },
  {
    id: 303,
    name: 'retired-link',
    credit_grant: 5.0,
    max_uses: 10,
    uses: 3,
    created_at: '2025-12-01T00:00:00Z',
    expires_at: null,
    revoked: true,
  },
] as const;
