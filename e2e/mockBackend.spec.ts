import { expect, test } from '@playwright/test';

// Smoke coverage for the mock backend itself. Feature-level E2E tests
// in later PRs exercise the full browser -> BFF -> mockBackend path.

const MOCK_BACKEND = 'http://localhost:9999';

test.describe('mockBackend (:9999)', () => {
  test('/health returns ok', async ({ request }) => {
    const response = await request.get(`${MOCK_BACKEND}/health`);
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  test('POST /api/auth/login with the canned credentials issues a token', async ({
    request,
  }) => {
    const response = await request.post(`${MOCK_BACKEND}/api/auth/login`, {
      data: { email: 'admin@kinvee.in', password: 'correct-horse' },
    });
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      token: string;
      expires_in: number;
      user: { email: string; role: string };
    };
    expect(body.token.length).toBeGreaterThanOrEqual(32);
    expect(body.user.role).toBe('admin');
    expect(body.expires_in).toBeGreaterThan(0);
  });

  test('POST /api/auth/login with bad credentials returns 401', async ({
    request,
  }) => {
    const response = await request.post(`${MOCK_BACKEND}/api/auth/login`, {
      data: { email: 'admin@kinvee.in', password: 'wrong' },
    });
    expect(response.status()).toBe(401);
  });

  test('admin list endpoints refuse requests without a Bearer token', async ({
    request,
  }) => {
    const response = await request.get(`${MOCK_BACKEND}/api/admin/keys`);
    expect(response.status()).toBe(401);
  });

  test('admin list endpoints honor Bearer auth and return an envelope', async ({
    request,
  }) => {
    const response = await request.get(
      `${MOCK_BACKEND}/api/admin/keys?envelope=1`,
      { headers: { Authorization: 'Bearer fake-token' } },
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      data: unknown[];
      pagination: { total: number };
    };
    expect(body.pagination.total).toBeGreaterThan(0);
  });
});
