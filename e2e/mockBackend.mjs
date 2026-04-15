// Real HTTP server that stands in for the backend during Playwright
// runs. MSW cannot intercept the BFF's server-side `fetch()` inside
// the Next runtime, so E2E needs a genuine listener.
//
// Kept in sync with the Vitest MSW handlers by convention; fixtures
// are duplicated here intentionally (a .mjs import of the .ts fixtures
// would force a build step for E2E-only code, and the shapes rarely
// change in practice).

import { createServer } from 'node:http';

const PORT = Number(process.env.MOCK_BACKEND_PORT ?? 9999);

// Matches internal/admin/admin.go::keyResponse. Field is `revoked`, not
// `is_active`; list response omits last_used_at / user_id / account_id.
const keys = [
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
];

const users = [
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
];

const accounts = [
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
];

const pricing = [
  {
    id: 201,
    model_id: 'llama3.1:8b',
    prompt_rate: 0.00005,
    completion_rate: 0.00015,
    typical_completion: 500,
    effective_from: '2025-10-01T00:00:00Z',
    active: true,
  },
];

const registrationTokens = [
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
];

// Usage analytics fixtures — match the BE 2 wire shapes locked in PLAN.md #20.
const usageSummary = {
  requests: 12480,
  prompt_tokens: 842110,
  completion_tokens: 1204988,
  total_tokens: 2047098,
  credits: 48.72,
  avg_duration_ms: 341.2,
  errors: 37,
};

const usageByModel = [
  { model: 'llama3.1:8b', requests: 9120, total_tokens: 1402044, credits: 21.03, avg_duration_ms: 311.5 },
  { model: 'llama3.1:70b', requests: 3360, total_tokens: 645054, credits: 27.69, avg_duration_ms: 442.1 },
];

const usageByUser = [
  {
    owner_type: 'user',
    user_id: 1,
    email: 'admin@kinvee.in',
    name: 'Krishna',
    account_id: 501,
    account_name: 'Default Admin Account',
    account_type: 'personal',
    requests: 8120,
    total_tokens: 1102984,
    credits: 18.44,
    key_count: 2,
  },
  {
    owner_type: 'service',
    user_id: null,
    email: null,
    name: null,
    account_id: 502,
    account_name: 'Batch Pipeline',
    account_type: 'service',
    requests: 4200,
    total_tokens: 928814,
    credits: 29.88,
    key_count: 1,
  },
  {
    owner_type: 'unattributed',
    user_id: null,
    email: null,
    name: null,
    account_id: null,
    account_name: null,
    account_type: null,
    requests: 160,
    total_tokens: 15300,
    credits: 0.4,
    key_count: 1,
  },
];

const usageTimeseries = {
  interval: 'hour',
  buckets: Array.from({ length: 24 }, (_, i) => ({
    bucket: new Date(Date.UTC(2026, 3, 14, i, 0, 0)).toISOString(),
    requests: 400 + ((i * 37) % 200),
    prompt_tokens: 30000 + ((i * 1111) % 9000),
    completion_tokens: 50000 + ((i * 2013) % 14000),
    total_tokens: 80000 + ((i * 3124) % 23000),
    credits: +(i * 0.23).toFixed(4),
    errors: i % 5,
  })),
};

const registrationEvents = [
  {
    id: 1,
    kind: 'admin_bootstrap',
    source: 'bootstrap',
    user_id: 1,
    user_email: 'admin@kinvee.in',
    user_name: 'Krishna',
    account_id: 501,
    account_name: 'Default Admin Account',
    account_type: 'personal',
    registration_token_id: null,
    metadata: null,
    created_at: '2025-10-01T00:00:00Z',
  },
  {
    id: 2,
    kind: 'user_signup',
    source: 'registration_token',
    user_id: 2,
    user_email: 'ops@kinvee.in',
    user_name: 'Ops Bot',
    account_id: 502,
    account_name: 'Batch Pipeline',
    account_type: 'service',
    registration_token_id: 301,
    metadata: { ip: '10.0.0.1' },
    created_at: '2026-01-15T12:00:00Z',
  },
];

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function envelope(items, url) {
  const limit = Number(url.searchParams.get('limit') ?? '10');
  const offset = Number(url.searchParams.get('offset') ?? '0');
  const slice = items.slice(offset, offset + limit);
  return {
    data: slice,
    pagination: { limit, offset, total: items.length },
  };
}

async function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function requireAuth(req, res) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    json(res, 401, { code: 'unauthorized' });
    return false;
  }
  return true;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const method = req.method?.toUpperCase() ?? 'GET';
  const path = url.pathname;

  // Unauthenticated endpoints.
  if (path === '/health' && method === 'GET') {
    return json(res, 200, { ok: true });
  }
  if (path === '/api/auth/login' && method === 'POST') {
    const body = await readJson(req).catch(() => ({}));
    if (body?.email === 'admin@kinvee.in' && body?.password === 'correct-horse') {
      return json(res, 200, {
        token: 'mock-backend-token-'.padEnd(64, 'x'),
        expires_in: 6 * 60 * 60,
        user: { id: 1, email: 'admin@kinvee.in', role: 'admin' },
      });
    }
    return json(res, 401, { code: 'invalid_credentials' });
  }
  if (path === '/api/auth/logout' && method === 'POST') {
    return json(res, 204, {});
  }

  // Everything under /api/admin/* requires Bearer auth.
  if (!path.startsWith('/api/admin/')) {
    return json(res, 404, { code: 'not_found' });
  }
  if (!requireAuth(req, res)) return;

  const adminPath = path.slice('/api/admin'.length);

  // Keys. Backend accepts ?is_active=true|false (mapped to !revoked).
  if (adminPath === '/keys' && method === 'GET') {
    let list = [...keys];
    const isActive = url.searchParams.get('is_active');
    if (isActive === 'true') list = list.filter((k) => !k.revoked);
    if (isActive === 'false') list = list.filter((k) => k.revoked);
    return json(res, 200, envelope(list, url));
  }
  if (adminPath === '/keys' && method === 'POST') {
    const body = await readJson(req).catch(() => ({}));
    return json(res, 201, {
      id: 999,
      name: body?.name ?? 'new-key',
      key: 'sk-' + 'a'.repeat(64),
      key_prefix: 'sk-newabcdef',
      rate_limit: body?.rate_limit ?? 60,
    });
  }
  if (/^\/keys\/\d+$/.test(adminPath) && method === 'DELETE') {
    return json(res, 200, { status: 'revoked' });
  }

  // Users.
  if (adminPath === '/users' && method === 'GET') {
    let list = [...users];
    const role = url.searchParams.get('role');
    if (role) list = list.filter((u) => u.role === role);
    const isActive = url.searchParams.get('is_active');
    if (isActive === 'true') list = list.filter((u) => u.is_active);
    if (isActive === 'false') list = list.filter((u) => !u.is_active);
    return json(res, 200, envelope(list, url));
  }
  if (/^\/users\/\d+\/activate$/.test(adminPath) && method === 'PUT') {
    return json(res, 200, { status: 'activated' });
  }
  if (/^\/users\/\d+\/deactivate$/.test(adminPath) && method === 'PUT') {
    const match = /^\/users\/(\d+)\/deactivate$/.exec(adminPath);
    if (match && match[1] === '1') {
      return json(res, 409, {
        error: {
          code: 'last_admin',
          type: 'invalid_request_error',
          message: 'Cannot remove the last active admin',
        },
      });
    }
    return json(res, 200, { status: 'deactivated' });
  }

  // Accounts.
  if (adminPath === '/accounts' && method === 'GET') {
    let list = [...accounts];
    const type = url.searchParams.get('type');
    if (type) list = list.filter((a) => a.type === type);
    return json(res, 200, envelope(list, url));
  }
  if (/^\/accounts\/\d+\/credits$/.test(adminPath) && method === 'POST') {
    const body = await readJson(req).catch(() => ({}));
    const amount = body?.amount ?? 0;
    return json(res, 200, {
      status: 'granted',
      amount,
      balance: 250 + amount,
    });
  }
  if (/^\/accounts\/\d+\/keys$/.test(adminPath) && method === 'POST') {
    const body = await readJson(req).catch(() => ({}));
    return json(res, 201, {
      id: 998,
      name: body?.name ?? 'account-scoped-key',
      key: 'sk-' + 'b'.repeat(64),
      key_prefix: 'sk-acctabc12',
      rate_limit: body?.rate_limit ?? 60,
    });
  }

  // Pricing.
  if (adminPath === '/pricing' && method === 'GET') {
    return json(res, 200, envelope(pricing, url));
  }
  if (adminPath === '/pricing' && method === 'POST') {
    return json(res, 200, { status: 'updated' });
  }
  if (/^\/pricing\/\d+$/.test(adminPath) && method === 'DELETE') {
    return json(res, 200, { status: 'deleted' });
  }

  // Registration tokens.
  if (adminPath === '/registration-tokens' && method === 'GET') {
    let list = [...registrationTokens];
    const isActive = url.searchParams.get('is_active');
    if (isActive === 'true') list = list.filter((t) => !t.revoked);
    if (isActive === 'false') list = list.filter((t) => t.revoked);
    return json(res, 200, envelope(list, url));
  }
  if (adminPath === '/registration-tokens' && method === 'POST') {
    const body = await readJson(req).catch(() => ({}));
    return json(res, 201, {
      id: 399,
      name: body?.name ?? 'new-token',
      token: 'reg-' + 'c'.repeat(64),
      credit_grant: body?.credit_grant ?? 0,
      max_uses: body?.max_uses ?? 1,
    });
  }
  if (/^\/registration-tokens\/\d+$/.test(adminPath) && method === 'DELETE') {
    return json(res, 200, { status: 'revoked' });
  }

  // Registration events (audit feed).
  if (adminPath === '/registrations' && method === 'GET') {
    return json(res, 200, envelope(registrationEvents, url));
  }

  // Usage analytics (BE 2). summary + timeseries use the detail envelope;
  // by-model + by-user use the list envelope (locked decision #20).
  if (adminPath === '/usage/summary' && method === 'GET') {
    return json(res, 200, { data: usageSummary });
  }
  if (adminPath === '/usage/by-model' && method === 'GET') {
    return json(res, 200, envelope(usageByModel, url));
  }
  if (adminPath === '/usage/by-user' && method === 'GET') {
    return json(res, 200, envelope(usageByUser, url));
  }
  if (adminPath === '/usage/timeseries' && method === 'GET') {
    return json(res, 200, { data: usageTimeseries });
  }

  return json(res, 404, { code: 'not_found', path: adminPath, method });
});

server.listen(PORT, () => {
  console.log(`mockBackend listening on http://localhost:${PORT}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
