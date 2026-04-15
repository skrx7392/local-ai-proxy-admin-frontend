import { HttpResponse, http } from 'msw';

import {
  accounts,
  keys,
  pricing,
  registrationEvents,
  registrationTokens,
  usageByModel,
  usageByUser,
  usageSummary,
  usageTimeseries,
  users,
} from './fixtures';

// Intercepts the BFF-relative URL that `apiFetch` builds
// (`/api/admin/...`). The jsdom `fetch` resolves this against the
// window.location.origin that Vitest sets, so MSW sees a fully
// qualified URL. The wildcard origin below handles that.

const ORIGIN = '*';
const base = (path: string) => `${ORIGIN}/api/admin${path}`;

function envelope<T>(
  items: readonly T[],
  url: URL,
): { data: T[]; pagination: { limit: number; offset: number; total: number } } {
  const limit = Number(url.searchParams.get('limit') ?? '10');
  const offset = Number(url.searchParams.get('offset') ?? '0');
  const slice = items.slice(offset, offset + limit);
  return {
    data: [...slice],
    pagination: { limit, offset, total: items.length },
  };
}

/**
 * Default handlers — representative coverage for each resource so hook
 * tests can run without having to stub per test. Individual tests can
 * override any handler via `server.use(...)` in a `beforeEach`.
 */
export const handlers = [
  // ---- Keys ----
  // Backend uses `revoked: boolean` on responses but still accepts
  // ?is_active=true|false as a filter param (mapped to !revoked server-side).
  http.get(base('/keys'), ({ request }) => {
    const url = new URL(request.url);
    let list = [...keys];
    const isActive = url.searchParams.get('is_active');
    if (isActive === 'true') list = list.filter((k) => !k.revoked);
    if (isActive === 'false') list = list.filter((k) => k.revoked);
    return HttpResponse.json(envelope(list, url));
  }),
  http.post(base('/keys'), async ({ request }) => {
    const body = (await request.json()) as { name?: string; rate_limit?: number };
    // Shape matches internal/admin/admin.go::createKeyResponse — the
    // plaintext lives in `key`, and the response is intentionally slim
    // (no created_at, no revoked flag).
    return HttpResponse.json(
      {
        id: 999,
        name: body?.name ?? 'new-key',
        key: 'sk-' + 'a'.repeat(64),
        key_prefix: 'sk-newabcdef',
        rate_limit: body?.rate_limit ?? 60,
      },
      { status: 201 },
    );
  }),
  http.delete(base('/keys/:id'), () =>
    HttpResponse.json({ status: 'revoked' }),
  ),

  // ---- Users ----
  http.get(base('/users'), ({ request }) => {
    const url = new URL(request.url);
    let list = [...users];
    const role = url.searchParams.get('role');
    if (role) list = list.filter((u) => u.role === role);
    const isActive = url.searchParams.get('is_active');
    if (isActive === 'true') list = list.filter((u) => u.is_active);
    if (isActive === 'false') list = list.filter((u) => !u.is_active);
    return HttpResponse.json(envelope(list, url));
  }),
  http.put(base('/users/:id/activate'), () =>
    HttpResponse.json({ status: 'activated' }),
  ),
  http.put(base('/users/:id/deactivate'), () =>
    HttpResponse.json({ status: 'deactivated' }),
  ),

  // ---- Accounts ----
  http.get(base('/accounts'), ({ request }) => {
    const url = new URL(request.url);
    let list = [...accounts];
    const type = url.searchParams.get('type');
    if (type) list = list.filter((a) => a.type === type);
    const isActive = url.searchParams.get('is_active');
    if (isActive === 'true') list = list.filter((a) => a.is_active);
    if (isActive === 'false') list = list.filter((a) => !a.is_active);
    return HttpResponse.json(envelope(list, url));
  }),
  http.post(base('/accounts/:id/credits'), async ({ request }) => {
    // Matches grantCredits response in internal/admin/admin.go
    const body = (await request.json()) as { amount?: number };
    const amount = body?.amount ?? 0;
    return HttpResponse.json({
      status: 'granted',
      amount,
      balance: 250 + amount,
    });
  }),
  http.post(base('/accounts/:id/keys'), async ({ request }) => {
    // Same shape as POST /api/admin/keys — backend reuses createKeyResponse.
    const body = (await request.json()) as { name?: string; rate_limit?: number };
    return HttpResponse.json(
      {
        id: 998,
        name: body?.name ?? 'account-scoped-key',
        key: 'sk-' + 'b'.repeat(64),
        key_prefix: 'sk-acctabc12',
        rate_limit: body?.rate_limit ?? 60,
      },
      { status: 201 },
    );
  }),

  // ---- Pricing ----
  http.get(base('/pricing'), ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json(envelope(pricing, url));
  }),
  http.post(base('/pricing'), () =>
    // Backend upsert returns a bare status — no echoed record.
    HttpResponse.json({ status: 'updated' }),
  ),
  http.delete(base('/pricing/:id'), () =>
    HttpResponse.json({ status: 'deleted' }),
  ),

  // ---- Registration tokens ----
  http.get(base('/registration-tokens'), ({ request }) => {
    const url = new URL(request.url);
    let list = [...registrationTokens];
    const isActive = url.searchParams.get('is_active');
    // Backend maps ?is_active to !revoked on this resource.
    if (isActive === 'true') list = list.filter((t) => !t.revoked);
    if (isActive === 'false') list = list.filter((t) => t.revoked);
    return HttpResponse.json(envelope(list, url));
  }),
  http.post(base('/registration-tokens'), async ({ request }) => {
    const body = (await request.json()) as {
      name?: string;
      credit_grant?: number;
      max_uses?: number;
    };
    return HttpResponse.json(
      {
        id: 399,
        name: body?.name ?? 'new-token',
        token: 'reg-' + 'c'.repeat(64),
        credit_grant: body?.credit_grant ?? 0,
        max_uses: body?.max_uses ?? 1,
      },
      { status: 201 },
    );
  }),
  http.delete(base('/registration-tokens/:id'), () =>
    HttpResponse.json({ status: 'revoked' }),
  ),

  // ---- Registration events (audit feed) ----
  http.get(base('/registrations'), ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json(envelope(registrationEvents, url));
  }),

  // ---- Usage analytics (BE 2) ----
  http.get(base('/usage/summary'), () =>
    HttpResponse.json({ data: usageSummary }),
  ),
  http.get(base('/usage/by-model'), ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json(envelope(usageByModel, url));
  }),
  http.get(base('/usage/by-user'), ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json(envelope(usageByUser, url));
  }),
  http.get(base('/usage/timeseries'), () =>
    HttpResponse.json({ data: usageTimeseries }),
  ),
];
