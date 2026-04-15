import { expect, test, type Page } from '@playwright/test';

const MOCK_BACKEND = 'http://localhost:9999';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill('admin@kinvee.in');
  await page.getByTestId('login-password').fill('correct-horse');
  await page.getByTestId('login-submit').click();
  await page.waitForURL((url) => url.pathname === '/');
}

test.describe('usage analytics', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('dashboard renders StatCards + a timeseries chart after login', async ({
    page,
  }) => {
    await expect(page.getByTestId('dashboard-stat-requests')).toBeVisible();
    await expect(page.getByTestId('dashboard-stat-tokens')).toBeVisible();
    await expect(page.getByTestId('dashboard-stat-credits')).toBeVisible();
    await expect(page.getByTestId('dashboard-stat-errors')).toBeVisible();
    await expect(page.getByTestId('dashboard-timeseries')).toBeVisible();
  });

  test('/usage tabs lazy-mount — only the active tab’s endpoint is called', async ({
    page,
  }) => {
    const calls: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname.startsWith('/api/admin/usage/')) {
        calls.push(url.pathname);
      }
    });

    await page.goto('/usage');
    await expect(page.getByTestId('usage-tab-summary')).toBeVisible();

    // Summary tab is active by default.
    await page.waitForResponse(
      (r) => r.url().includes('/api/admin/usage/summary') && r.ok(),
    );
    expect(calls.some((p) => p.endsWith('/summary'))).toBe(true);
    expect(calls.some((p) => p.endsWith('/by-model'))).toBe(false);
    expect(calls.some((p) => p.endsWith('/timeseries'))).toBe(false);

    await page.getByTestId('usage-tab-timeseries').click();
    await page.waitForResponse(
      (r) => r.url().includes('/api/admin/usage/timeseries') && r.ok(),
    );
    expect(calls.some((p) => p.endsWith('/timeseries'))).toBe(true);
  });

  test('quick-picks write absolute ISO since/until into the URL and survive reload', async ({
    page,
  }) => {
    await page.goto('/usage');
    await page.getByTestId('usage-quick-pick-7d').click();

    await page.waitForURL(/since=.*Z/);
    const url1 = new URL(page.url());
    const since1 = url1.searchParams.get('since');
    const until1 = url1.searchParams.get('until');
    expect(since1).toMatch(/Z$/);
    expect(until1).toMatch(/Z$/);
    const span = Date.parse(until1!) - Date.parse(since1!);
    expect(span).toBe(7 * 24 * 60 * 60 * 1000);

    // Reload preserves the range and the filter controls.
    await page.reload();
    const url2 = new URL(page.url());
    expect(url2.searchParams.get('since')).toBe(since1);
    expect(url2.searchParams.get('until')).toBe(until1);
  });
});

test.describe('mockBackend usage endpoints (wire shapes)', () => {
  test('summary returns a detail envelope', async ({ request }) => {
    const response = await request.get(
      `${MOCK_BACKEND}/api/admin/usage/summary`,
      { headers: { Authorization: 'Bearer fake' } },
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      data: { requests: number };
      pagination?: unknown;
    };
    expect(body.data.requests).toBeGreaterThan(0);
    expect(body.pagination).toBeUndefined();
  });

  test('timeseries returns a detail envelope (not a list)', async ({
    request,
  }) => {
    const response = await request.get(
      `${MOCK_BACKEND}/api/admin/usage/timeseries`,
      { headers: { Authorization: 'Bearer fake' } },
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      data: { interval: string; buckets: unknown[] };
      pagination?: unknown;
    };
    expect(body.data.interval).toBe('hour');
    expect(Array.isArray(body.data.buckets)).toBe(true);
    expect(body.pagination).toBeUndefined();
  });

  test('by-model / by-user use the list envelope', async ({ request }) => {
    for (const path of ['by-model', 'by-user']) {
      const response = await request.get(
        `${MOCK_BACKEND}/api/admin/usage/${path}`,
        { headers: { Authorization: 'Bearer fake' } },
      );
      expect(response.status()).toBe(200);
      const body = (await response.json()) as {
        data: unknown[];
        pagination: { total: number };
      };
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination.total).toBeGreaterThan(0);
    }
  });
});
