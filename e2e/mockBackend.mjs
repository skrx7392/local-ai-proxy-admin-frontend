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
];

const accounts = [
  {
    id: 501,
    name: 'Default Admin Account',
    type: 'personal',
    is_active: true,
    credits_remaining: 250000,
    created_at: '2025-10-01T00:00:00Z',
  },
];

const pricing = [
  {
    id: 201,
    model: 'llama3.1:8b',
    input_per_1m: 50,
    output_per_1m: 150,
    is_active: true,
    created_at: '2025-10-01T00:00:00Z',
  },
];

const registrationTokens = [
  {
    id: 301,
    label: 'ops-onboarding',
    token_prefix: 'rt_abc',
    is_active: true,
    credits_grant: 10000,
    created_at: '2026-03-01T00:00:00Z',
    expires_at: '2026-06-01T00:00:00Z',
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
  if (url.searchParams.get('envelope') !== '1') {
    return { data: slice };
  }
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
    return json(res, 200, { ok: true });
  }
  if (/^\/users\/\d+\/deactivate$/.test(adminPath) && method === 'PUT') {
    return json(res, 200, { ok: true });
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
    return json(res, 200, { ok: true, amount_cents: body?.amount_cents ?? 0 });
  }
  if (/^\/accounts\/\d+\/keys$/.test(adminPath) && method === 'POST') {
    return json(res, 201, {
      id: 998,
      plaintext_key: 'sk_live_acct_SECRET_ONLY_SHOWN_ONCE',
    });
  }

  // Pricing.
  if (adminPath === '/pricing' && method === 'GET') {
    return json(res, 200, envelope(pricing, url));
  }
  if (adminPath === '/pricing' && method === 'POST') {
    const body = await readJson(req).catch(() => ({}));
    return json(res, 201, { id: 299, ...body });
  }
  if (/^\/pricing\/\d+$/.test(adminPath) && method === 'DELETE') {
    return json(res, 200, { ok: true });
  }

  // Registration tokens.
  if (adminPath === '/registration-tokens' && method === 'GET') {
    return json(res, 200, envelope(registrationTokens, url));
  }
  if (adminPath === '/registration-tokens' && method === 'POST') {
    return json(res, 201, {
      id: 399,
      plaintext_token: 'rt_new_SECRET_ONLY_SHOWN_ONCE',
    });
  }
  if (/^\/registration-tokens\/\d+$/.test(adminPath) && method === 'DELETE') {
    return json(res, 200, { ok: true });
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
